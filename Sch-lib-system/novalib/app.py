import sys
import faulthandler
import logging
import os
import traceback

from PyQt5.QtCore import QTimer
from PyQt5.QtGui import QIcon
from PyQt5.QtWidgets import QApplication, QMessageBox

from novalib import __app_name__
from novalib.config import log_path, resource_path
from novalib.db import Database
from novalib.services import NovaLibService
from novalib.ui.main_window import LoginWindow


_FAULT_LOG_FILE = None


def setup_logging() -> None:
    global _FAULT_LOG_FILE
    path = log_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        filename=path,
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    try:
        _FAULT_LOG_FILE = path.open("a", encoding="utf-8")
        faulthandler.enable(_FAULT_LOG_FILE, all_threads=True)
    except Exception:
        logging.exception("Could not enable faulthandler")

    def handle_exception(exc_type, exc_value, exc_tb):
        logging.critical("Unhandled exception", exc_info=(exc_type, exc_value, exc_tb))
        try:
            QMessageBox.critical(
                None,
                __app_name__,
                f"NovaLib hit an error and wrote details to:\n{path}\n\n{exc_value}",
            )
        finally:
            sys.__excepthook__(exc_type, exc_value, exc_tb)

    sys.excepthook = handle_exception


def start_scheduler(service: NovaLibService):
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
    except Exception:
        logging.exception("APScheduler could not be imported")
        return None

    scheduler = BackgroundScheduler(daemon=True)
    scheduler.add_job(service.run_daily_housekeeping, "cron", hour=2, minute=0, id="daily_housekeeping")
    scheduler.start()
    return scheduler


def main() -> int:
    setup_logging()
    logging.info("Starting NovaLib with argv=%s frozen=%s", sys.argv, getattr(sys, "frozen", False))

    try:
        app = QApplication(sys.argv)
        app.setApplicationName(__app_name__)
        icon_path = resource_path("novalib/assets/novalib-icon.ico")
        if icon_path.exists():
            app.setWindowIcon(QIcon(str(icon_path)))

        db = Database()
        db.initialize(seed=True)
        service = NovaLibService(db)
        service.run_daily_housekeeping()

        if "--smoke-login" in sys.argv:
            window = LoginWindow(service)
            window.show()
            app.processEvents()
            window._login()
            app.processEvents()
            if window.main_window is None:
                raise RuntimeError("Smoke login did not open the main window")
            window.main_window.show()
            app.processEvents()
            QTimer.singleShot(250, app.quit)
            app.exec_()
            logging.info("Smoke login created %s", window.main_window.windowTitle())
            return 0

        if "--smoke-test" in sys.argv or os.getenv("NOVALIB_SMOKE_TEST") == "1":
            window = LoginWindow(service)
            window.show()
            app.processEvents()
            QTimer.singleShot(250, app.quit)
            app.exec_()
            logging.info("Smoke test created %s", window.windowTitle())
            return 0

        scheduler = start_scheduler(service)
        if scheduler:
            app.aboutToQuit.connect(lambda: scheduler.shutdown(wait=False))

        window = LoginWindow(service)
        window.show()
        exit_code = app.exec_()
        logging.info("NovaLib exited with code %s", exit_code)
        return exit_code
    except Exception as exc:
        logging.critical("Startup failed\n%s", traceback.format_exc())
        try:
            QMessageBox.critical(
                None,
                __app_name__,
                f"NovaLib could not start.\n\n{exc}\n\nLog file:\n{log_path()}",
            )
        except Exception:
            pass
        return 1
