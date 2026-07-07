from __future__ import annotations

import re
from datetime import datetime
from functools import partial
from html import escape
from pathlib import Path
from typing import Iterable

from PyQt5 import QtCore, QtGui, QtPrintSupport, QtWidgets

from novalib import __app_name__, __company__
from novalib.config import resource_path
from novalib.services import NovaLibError, NovaLibService
from novalib.ui.styles import app_qss, theme_options, theme_palette


LEVEL_OPTIONS = ["", "O Level", "A Level", "S1", "S2", "S3", "S4", "S5", "S6"]


def apply_app_theme(theme_key: str) -> None:
    stylesheet = app_qss(theme_key)
    app = QtWidgets.QApplication.instance()
    if app is not None:
        app.setStyleSheet(stylesheet)


def novalib_icon() -> QtGui.QIcon:
    path = resource_path("novalib/assets/novalib-icon.ico")
    return QtGui.QIcon(str(path)) if path.exists() else QtGui.QIcon()


def clear_layout(layout: QtWidgets.QLayout) -> None:
    while layout.count():
        item = layout.takeAt(0)
        widget = item.widget()
        if widget is not None:
            widget.deleteLater()


def make_label(text: str, object_name: str = "") -> QtWidgets.QLabel:
    label = QtWidgets.QLabel(text)
    if object_name:
        label.setObjectName(object_name)
    return label


def set_table(table: QtWidgets.QTableWidget, headers: list[str], rows: Iterable[dict], keys: list[str]) -> None:
    rows = list(rows)
    table.setColumnCount(len(headers))
    table.setHorizontalHeaderLabels(headers)
    table.setRowCount(len(rows))
    table.setAlternatingRowColors(True)
    table.setSelectionBehavior(QtWidgets.QAbstractItemView.SelectRows)
    table.setEditTriggers(QtWidgets.QAbstractItemView.NoEditTriggers)
    for row_index, row in enumerate(rows):
        for column_index, key in enumerate(keys):
            value = row.get(key)
            text = "" if value is None else str(value)
            item = QtWidgets.QTableWidgetItem(text)
            table.setItem(row_index, column_index, item)
    table.resizeColumnsToContents()
    table.horizontalHeader().setStretchLastSection(True)


def print_table(
    parent: QtWidgets.QWidget,
    title: str,
    table: QtWidgets.QTableWidget,
    subtitle: str = "",
) -> None:
    if table.rowCount() == 0:
        message(parent, "There is nothing to print", error=True)
        return

    headers = [
        table.horizontalHeaderItem(column).text() if table.horizontalHeaderItem(column) else ""
        for column in range(table.columnCount())
    ]
    rows = []
    for row in range(table.rowCount()):
        cells = []
        for column in range(table.columnCount()):
            item = table.item(row, column)
            cells.append(escape(item.text() if item else ""))
        rows.append(cells)

    header_html = "".join(f"<th>{escape(header)}</th>" for header in headers)
    body_html = "".join(
        "<tr>" + "".join(f"<td>{cell}</td>" for cell in row) + "</tr>"
        for row in rows
    )
    html = f"""
    <html>
      <head>
        <style>
          body {{ font-family: Arial, sans-serif; font-size: 10pt; }}
          h1 {{ font-size: 16pt; margin-bottom: 2px; }}
          .subtitle {{ color: #475569; margin-bottom: 14px; }}
          table {{ border-collapse: collapse; width: 100%; }}
          th, td {{ border: 1px solid #cbd5e1; padding: 6px; text-align: left; }}
          th {{ background: #e2e8f0; }}
        </style>
      </head>
      <body>
        <h1>{escape(title)}</h1>
        <div class="subtitle">{escape(subtitle)}<br>Printed {datetime.now().strftime('%Y-%m-%d %H:%M')}</div>
        <table>
          <thead><tr>{header_html}</tr></thead>
          <tbody>{body_html}</tbody>
        </table>
      </body>
    </html>
    """

    filename = re.sub(r"[^A-Za-z0-9]+", "_", title).strip("_") or "novalib_report"
    filename = f"{filename}_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
    documents = QtCore.QStandardPaths.writableLocation(QtCore.QStandardPaths.DocumentsLocation)
    default_path = str(Path(documents) / filename) if documents else filename
    output_path, _ = QtWidgets.QFileDialog.getSaveFileName(
        parent,
        "Export PDF",
        default_path,
        "PDF files (*.pdf)",
    )
    if not output_path:
        return
    if not output_path.lower().endswith(".pdf"):
        output_path = f"{output_path}.pdf"

    printer = QtPrintSupport.QPrinter(QtPrintSupport.QPrinter.HighResolution)
    printer.setOutputFormat(QtPrintSupport.QPrinter.PdfFormat)
    printer.setOutputFileName(output_path)
    document = QtGui.QTextDocument()
    document.setHtml(html)
    document.print_(printer)
    message(parent, f"PDF exported:\n{output_path}")


def school_subtitle(service: NovaLibService) -> str:
    profile = service.get_school_profile()
    return " - ".join(part for part in [profile.get("name", ""), profile.get("address", "")] if part)


class LoginWindow(QtWidgets.QWidget):
    def __init__(self, service: NovaLibService) -> None:
        super().__init__()
        self.service = service
        self.main_window: MainWindow | None = None
        self.theme_key = self.service.get_theme_key()
        self.setWindowTitle(f"{__app_name__} Login")
        self.setWindowIcon(novalib_icon())
        self.setMinimumSize(900, 560)
        apply_app_theme(self.theme_key)
        self.setStyleSheet(app_qss(self.theme_key))
        self._build()

    def _build(self) -> None:
        outer = QtWidgets.QVBoxLayout(self)
        outer.setContentsMargins(0, 0, 0, 0)
        outer.setSpacing(0)

        backdrop = QtWidgets.QFrame()
        backdrop.setObjectName("LoginBackdrop")
        backdrop.setAutoFillBackground(True)
        outer.addWidget(backdrop, 1)

        layout = QtWidgets.QVBoxLayout(backdrop)
        layout.setContentsMargins(0, 36, 0, 0)
        layout.setAlignment(QtCore.Qt.AlignHCenter)
        layout.setSpacing(22)

        title = make_label("Library management system", "LoginTitle")
        title.setAlignment(QtCore.Qt.AlignCenter)
        layout.addWidget(title)

        card = QtWidgets.QFrame()
        card.setObjectName("LoginCard")
        card.setFixedWidth(390)
        layout.addWidget(card, 0, QtCore.Qt.AlignHCenter)

        card_layout = QtWidgets.QVBoxLayout(card)
        card_layout.setContentsMargins(38, 30, 38, 34)
        card_layout.setSpacing(14)

        form_title = make_label("Librarian Login Form", "CardTitle")
        card_layout.addWidget(form_title)

        self.username = QtWidgets.QLineEdit()
        self.username.setPlaceholderText("Username")
        self.username.setText("admin@novalib.local")
        card_layout.addWidget(self.username)

        self.password = QtWidgets.QLineEdit()
        self.password.setPlaceholderText("Password")
        self.password.setEchoMode(QtWidgets.QLineEdit.Password)
        self.password.setText("admin123")
        card_layout.addWidget(self.password)

        row = QtWidgets.QHBoxLayout()
        self.login_button = QtWidgets.QPushButton("Login")
        self.login_button.setObjectName("DangerButton")
        self.login_button.clicked.connect(self._login)
        row.addWidget(self.login_button)

        forgot = QtWidgets.QPushButton("Lost your password?")
        forgot.setObjectName("GhostButton")
        forgot.clicked.connect(lambda: self._message("Ask another librarian to reset the account password."))
        row.addWidget(forgot)
        row.addStretch()
        card_layout.addLayout(row)

        self.password.returnPressed.connect(self._login)
        self.username.returnPressed.connect(self._login)

        footer = QtWidgets.QLabel(f"© All rights reserved {__company__}")
        footer.setAlignment(QtCore.Qt.AlignCenter)
        outer.addWidget(footer, 0)
        footer.setFixedHeight(54)

    def paintEvent(self, event) -> None:
        super().paintEvent(event)
        painter = QtGui.QPainter(self)
        rect = self.rect()
        top_rect = QtCore.QRect(rect.left(), rect.top(), rect.width(), max(1, rect.height() - 54))
        colors = theme_palette(self.theme_key)
        gradient = QtGui.QLinearGradient(0, 0, rect.width(), top_rect.height())
        gradient.setColorAt(0, QtGui.QColor(colors["login_1"]))
        gradient.setColorAt(0.45, QtGui.QColor(colors["login_2"]))
        gradient.setColorAt(1, QtGui.QColor(colors["login_3"]))
        painter.fillRect(top_rect, gradient)

        pen = QtGui.QPen(QtGui.QColor(255, 255, 255, 38), 2)
        painter.setPen(pen)
        for y in range(96, top_rect.height(), 38):
            painter.drawLine(0, y, rect.width(), y - 80)
        for x in range(0, rect.width(), 92):
            painter.drawRect(x, top_rect.height() - 210, 58, 150)

    def _login(self) -> None:
        account = self.service.authenticate(self.username.text(), self.password.text())
        if not account:
            self._message("Invalid username or password", error=True)
            return

        self.main_window = MainWindow(self.service, account)
        self.main_window.show()
        self.close()

    def _message(self, text: str, error: bool = False) -> None:
        icon = QtWidgets.QMessageBox.Warning if error else QtWidgets.QMessageBox.Information
        QtWidgets.QMessageBox(icon, __app_name__, text, QtWidgets.QMessageBox.Ok, self).exec_()


class MainWindow(QtWidgets.QMainWindow):
    def __init__(self, service: NovaLibService, account: dict) -> None:
        super().__init__()
        self.service = service
        self.account = account
        self.pages: dict[str, QtWidgets.QWidget] = {}
        self.nav_buttons: list[QtWidgets.QPushButton] = []
        self.theme_key = self.service.get_theme_key()
        self.setWindowTitle(f"{__app_name__} - Librarian control panel")
        self.setWindowIcon(novalib_icon())
        self.setMinimumSize(1180, 720)
        self.apply_theme(self.theme_key)
        self._build()
        self.show_dashboard()

    def apply_theme(self, theme_key: str) -> None:
        self.theme_key = theme_key
        apply_app_theme(theme_key)
        self.setStyleSheet(app_qss(theme_key))

    def _build(self) -> None:
        central = QtWidgets.QWidget()
        self.setCentralWidget(central)
        root = QtWidgets.QVBoxLayout(central)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        top = QtWidgets.QFrame()
        top.setObjectName("TopBar")
        top.setFixedHeight(52)
        top_layout = QtWidgets.QHBoxLayout(top)
        top_layout.setContentsMargins(16, 0, 18, 0)
        top_layout.addWidget(make_label("LMS", "TopTitle"))
        top_layout.addStretch()
        profile = self.service.get_school_profile()
        self.school_title_label = make_label(profile["name"], "TopTitle")
        top_layout.addWidget(self.school_title_label)
        top_layout.addStretch()
        top_layout.addWidget(make_label(self.account["name"], "TopTitle"))
        root.addWidget(top)

        body = QtWidgets.QHBoxLayout()
        body.setContentsMargins(0, 0, 0, 0)
        body.setSpacing(0)
        root.addLayout(body, 1)

        sidebar = QtWidgets.QFrame()
        sidebar.setObjectName("Sidebar")
        sidebar.setFixedWidth(220)
        body.addWidget(sidebar)

        side_layout = QtWidgets.QVBoxLayout(sidebar)
        side_layout.setContentsMargins(0, 22, 0, 12)
        side_layout.setSpacing(4)

        avatar = QtWidgets.QLabel()
        avatar.setFixedSize(70, 70)
        avatar.setAlignment(QtCore.Qt.AlignCenter)
        avatar.setPixmap(self._avatar_pixmap(70))
        side_layout.addWidget(avatar, 0, QtCore.Qt.AlignHCenter)
        side_layout.addWidget(make_label("Welcome!", "SidebarSmall"), 0, QtCore.Qt.AlignHCenter)
        side_layout.addWidget(make_label(str(self.account["name"]), "SidebarName"), 0, QtCore.Qt.AlignHCenter)

        general = make_label("General", "SidebarSmall")
        general.setContentsMargins(16, 20, 0, 6)
        side_layout.addWidget(general)

        nav_items = [
            ("Dashboard", self.show_dashboard),
            ("Catalog", partial(self.show_page, "catalog")),
            ("Members", partial(self.show_page, "members")),
            ("Circulation", partial(self.show_page, "circulation")),
            ("Reservations", partial(self.show_page, "reservations")),
            ("Fines", partial(self.show_page, "fines")),
            ("Settings", partial(self.show_page, "settings")),
        ]
        for title, callback in nav_items:
            button = QtWidgets.QPushButton(title)
            button.setObjectName("NavButton")
            button.setCheckable(True)
            button.clicked.connect(callback)
            side_layout.addWidget(button)
            self.nav_buttons.append(button)

        side_layout.addStretch()

        content = QtWidgets.QWidget()
        content_layout = QtWidgets.QVBoxLayout(content)
        content_layout.setContentsMargins(18, 18, 18, 12)
        content_layout.setSpacing(12)
        body.addWidget(content, 1)

        self.breadcrumb = make_label("Dashboard   Control panel", "HintText")
        content_layout.addWidget(self.breadcrumb)

        self.stack = QtWidgets.QStackedWidget()
        content_layout.addWidget(self.stack, 1)

        self.pages["dashboard"] = DashboardPage(self.service, self)
        self.pages["catalog"] = CatalogPage(self.service, self)
        self.pages["members"] = MembersPage(self.service, self)
        self.pages["circulation"] = CirculationPage(self.service, self, int(self.account["id"]))
        self.pages["reservations"] = ReservationsPage(self.service, self)
        self.pages["fines"] = FinesPage(self.service, self)
        self.pages["settings"] = SettingsPage(self.service, self)

        for page in self.pages.values():
            self.stack.addWidget(page)

        footer = QtWidgets.QLabel(f"© All rights reserved {__company__}")
        footer.setAlignment(QtCore.Qt.AlignCenter)
        content_layout.addWidget(footer)

    def _avatar_pixmap(self, size: int) -> QtGui.QPixmap:
        pixmap = QtGui.QPixmap(size, size)
        pixmap.fill(QtCore.Qt.transparent)
        painter = QtGui.QPainter(pixmap)
        painter.setRenderHint(QtGui.QPainter.Antialiasing)
        painter.setBrush(QtGui.QColor("#f8fafc"))
        painter.setPen(QtGui.QPen(QtGui.QColor("#dbeafe"), 2))
        painter.drawEllipse(1, 1, size - 2, size - 2)
        painter.setBrush(QtGui.QColor("#cbd5e1"))
        painter.setPen(QtCore.Qt.NoPen)
        painter.drawEllipse(QtCore.QRectF(size * 0.32, size * 0.20, size * 0.36, size * 0.36))
        painter.drawEllipse(QtCore.QRectF(size * 0.20, size * 0.56, size * 0.60, size * 0.34))
        painter.end()
        return pixmap

    def show_dashboard(self) -> None:
        self.show_page("dashboard")

    def show_page(self, name: str) -> None:
        page = self.pages[name]
        if hasattr(page, "refresh"):
            page.refresh()
        self.stack.setCurrentWidget(page)
        self.breadcrumb.setText(f"{name.title()}   Control panel")
        for button in self.nav_buttons:
            button.setChecked(button.text().lower() == name)


class DashboardPage(QtWidgets.QWidget):
    def __init__(self, service: NovaLibService, parent: MainWindow) -> None:
        super().__init__()
        self.service = service
        self.parent_window = parent
        self.cards: dict[str, tuple[QtWidgets.QLabel, QtWidgets.QLabel]] = {}
        self._build()

    def _build(self) -> None:
        layout = QtWidgets.QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(18)

        header = QtWidgets.QFrame()
        header.setObjectName("Panel")
        header_layout = QtWidgets.QHBoxLayout(header)
        header_layout.setContentsMargins(14, 12, 14, 12)
        header_layout.setSpacing(12)
        self.school_logo = QtWidgets.QLabel()
        self.school_logo.setFixedSize(72, 72)
        self.school_logo.setAlignment(QtCore.Qt.AlignCenter)
        header_layout.addWidget(self.school_logo)
        text_layout = QtWidgets.QVBoxLayout()
        self.school_name = make_label("", "SectionTitle")
        self.school_address = make_label("", "HintText")
        text_layout.addWidget(self.school_name)
        text_layout.addWidget(self.school_address)
        header_layout.addLayout(text_layout, 1)
        layout.addWidget(header)

        grid = QtWidgets.QGridLayout()
        grid.setHorizontalSpacing(22)
        grid.setVerticalSpacing(18)
        layout.addLayout(grid)

        items = [
            ("members", "Members", "#0db8d8"),
            ("issued_books", "Issued Books", "#05a563"),
            ("books", "Books", "#e74c3c"),
            ("fine", "Fine", "#f39c12"),
            ("catalog", "Manage Book", "#e74c3c"),
            ("members_page", "Manage User", "#f39c12"),
            ("circulation", "Status", "#0db8d8"),
            ("reservations", "Requested Books", "#05a563"),
        ]
        for index, (key, label, color) in enumerate(items):
            row = index // 4
            col = index % 4
            card = self._stat_card(key, label, color)
            grid.addWidget(card, row, col)

        layout.addStretch()

    def _stat_card(self, key: str, label: str, color: str) -> QtWidgets.QFrame:
        frame = QtWidgets.QFrame()
        frame.setObjectName("StatCard")
        frame.setStyleSheet(f"QFrame#StatCard {{ background: {color}; }}")
        frame.setMinimumHeight(86)
        layout = QtWidgets.QVBoxLayout(frame)
        layout.setContentsMargins(14, 10, 14, 10)
        number = make_label("", "StatNumber")
        text = make_label(label, "StatLabel")
        layout.addWidget(number)
        layout.addWidget(text)
        self.cards[key] = (number, text)
        if key == "catalog":
            frame.mousePressEvent = lambda event: self.parent_window.show_page("catalog")
        elif key == "members_page":
            frame.mousePressEvent = lambda event: self.parent_window.show_page("members")
        elif key == "circulation":
            frame.mousePressEvent = lambda event: self.parent_window.show_page("circulation")
        elif key == "reservations":
            frame.mousePressEvent = lambda event: self.parent_window.show_page("reservations")
        return frame

    def refresh(self) -> None:
        profile = self.service.get_school_profile()
        self.school_name.setText(profile["name"])
        self.school_address.setText(profile["address"])
        self._set_school_logo(profile.get("logo_path", ""))
        stats = self.service.dashboard_stats()
        mapping = {
            "members": stats["members"],
            "issued_books": stats["issued_books"],
            "books": stats["books"],
            "fine": stats["fine"],
            "catalog": "",
            "members_page": "",
            "circulation": "",
            "reservations": stats["requested_books"],
        }
        for key, value in mapping.items():
            self.cards[key][0].setText(str(value))

    def _set_school_logo(self, path: str) -> None:
        pixmap = QtGui.QPixmap(path) if path else QtGui.QPixmap()
        if pixmap.isNull():
            pixmap = QtGui.QPixmap(72, 72)
            pixmap.fill(QtCore.Qt.transparent)
            painter = QtGui.QPainter(pixmap)
            painter.setRenderHint(QtGui.QPainter.Antialiasing)
            painter.setBrush(QtGui.QColor("#0b4a63"))
            painter.setPen(QtCore.Qt.NoPen)
            painter.drawRoundedRect(2, 2, 68, 68, 8, 8)
            painter.setPen(QtGui.QColor("#ffffff"))
            painter.setFont(QtGui.QFont("Segoe UI", 18, QtGui.QFont.Bold))
            painter.drawText(pixmap.rect(), QtCore.Qt.AlignCenter, "NL")
            painter.end()
        self.school_logo.setPixmap(
            pixmap.scaled(72, 72, QtCore.Qt.KeepAspectRatio, QtCore.Qt.SmoothTransformation)
        )


class CatalogPage(QtWidgets.QWidget):
    def __init__(self, service: NovaLibService, parent: MainWindow) -> None:
        super().__init__()
        self.service = service
        self.parent_window = parent
        self.selected_book_id: int | None = None
        self._build()

    def _build(self) -> None:
        layout = QtWidgets.QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(12)

        top = QtWidgets.QHBoxLayout()
        top.addWidget(make_label("Catalog Management", "SectionTitle"))
        top.addStretch()
        self.search = QtWidgets.QLineEdit()
        self.search.setPlaceholderText("Search title, author, subject, ISBN, shelf")
        self.search.textChanged.connect(self.refresh)
        top.addWidget(self.search, 1)
        self.level_filter = QtWidgets.QComboBox()
        self.level_filter.setEditable(True)
        self.level_filter.addItems(LEVEL_OPTIONS)
        self.level_filter.currentTextChanged.connect(self.refresh)
        top.addWidget(self.level_filter)
        print_button = QtWidgets.QPushButton("Export Catalog PDF")
        print_button.clicked.connect(self._print_catalog)
        top.addWidget(print_button)
        layout.addLayout(top)

        split = QtWidgets.QSplitter(QtCore.Qt.Horizontal)
        layout.addWidget(split, 1)

        self.table = QtWidgets.QTableWidget()
        self.table.itemSelectionChanged.connect(self._load_selected_book)
        split.addWidget(self.table)

        panel = QtWidgets.QFrame()
        panel.setObjectName("Panel")
        panel.setMinimumWidth(330)
        split.addWidget(panel)

        form = QtWidgets.QFormLayout(panel)
        form.setContentsMargins(16, 16, 16, 16)
        form.setSpacing(10)

        self.title = QtWidgets.QLineEdit()
        self.book_id = QtWidgets.QLineEdit()
        self.book_id.setReadOnly(True)
        self.author = QtWidgets.QLineEdit()
        self.subject = QtWidgets.QLineEdit()
        self.class_level = QtWidgets.QComboBox()
        self.class_level.setEditable(True)
        self.class_level.addItems(LEVEL_OPTIONS)
        self.isbn = QtWidgets.QLineEdit()
        self.pub_date = QtWidgets.QLineEdit()
        self.rack = QtWidgets.QLineEdit()
        self.rack.setPlaceholderText("Shelf no., letter, or name")
        self.copies = QtWidgets.QSpinBox()
        self.copies.setRange(1, 100)
        self.copies.setValue(1)

        form.addRow("Selected ID", self.book_id)
        form.addRow("Title", self.title)
        form.addRow("Author", self.author)
        form.addRow("Subject", self.subject)
        form.addRow("Level", self.class_level)
        form.addRow("ISBN", self.isbn)
        form.addRow("Pub date", self.pub_date)
        form.addRow("Shelf", self.rack)
        form.addRow("Copies", self.copies)

        add = QtWidgets.QPushButton("Add Book")
        add.clicked.connect(self._add_book)
        update = QtWidgets.QPushButton("Update Selected")
        update.clicked.connect(self._update_book)
        clear = QtWidgets.QPushButton("Clear Form")
        clear.setObjectName("GhostButton")
        clear.clicked.connect(self._clear_form)
        actions = QtWidgets.QHBoxLayout()
        actions.addWidget(add)
        actions.addWidget(update)
        actions.addWidget(clear)
        form.addRow(actions)

    def refresh(self) -> None:
        rows = self.service.search_catalog(self.search.text(), self.level_filter.currentText())
        set_table(
            self.table,
            ["ID", "Title", "Author", "Subject", "Level", "Shelf", "ISBN", "Total", "Available", "Requests"],
            rows,
            [
                "book_id",
                "title",
                "author",
                "subject",
                "class_level",
                "shelves",
                "isbn",
                "copies_total",
                "copies_available",
                "active_reservations",
            ],
        )

    def _load_selected_book(self) -> None:
        selected = self.table.selectedItems()
        if not selected:
            return
        row = selected[0].row()
        item = self.table.item(row, 0)
        if item is None or not item.text().isdigit():
            return
        book_id = int(item.text())
        try:
            book = self.service.get_book(book_id)
        except NovaLibError as exc:
            message(self, str(exc), error=True)
            return
        self.selected_book_id = book_id
        self.book_id.setText(str(book_id))
        self.title.setText(book.get("title") or "")
        self.author.setText(book.get("author") or "")
        self.subject.setText(book.get("subject") or "")
        self.class_level.setCurrentText(book.get("class_level") or "")
        self.isbn.setText(book.get("isbn") or "")
        self.pub_date.setText(book.get("pub_date") or "")
        self.rack.setText(book.get("shelf") or "")

    def _add_book(self) -> None:
        try:
            self.service.create_book(
                self.title.text(),
                self.author.text(),
                self.subject.text(),
                self.class_level.currentText(),
                self.isbn.text(),
                self.pub_date.text(),
                self.rack.text(),
                self.copies.value(),
            )
        except NovaLibError as exc:
            message(self, str(exc), error=True)
            return
        for widget in [self.title, self.author, self.subject, self.isbn, self.pub_date, self.rack]:
            widget.clear()
        self.class_level.setCurrentIndex(0)
        self.copies.setValue(1)
        self.refresh()
        self.parent_window.pages["dashboard"].refresh()
        message(self, "Book saved")

    def _update_book(self) -> None:
        if self.selected_book_id is None:
            message(self, "Select a book in the catalog table first", error=True)
            return
        try:
            self.service.update_book(
                self.selected_book_id,
                self.title.text(),
                self.author.text(),
                self.subject.text(),
                self.class_level.currentText(),
                self.isbn.text(),
                self.pub_date.text(),
                self.rack.text(),
            )
        except Exception as exc:
            message(self, str(exc), error=True)
            return
        self.refresh()
        self.parent_window.pages["circulation"].refresh()
        message(self, "Book updated")

    def _clear_form(self) -> None:
        self.selected_book_id = None
        self.book_id.clear()
        for widget in [self.title, self.author, self.subject, self.isbn, self.pub_date, self.rack]:
            widget.clear()
        self.class_level.setCurrentIndex(0)
        self.copies.setValue(1)

    def _print_catalog(self) -> None:
        print_table(self, "Catalog Report", self.table, school_subtitle(self.service))


class MembersPage(QtWidgets.QWidget):
    def __init__(self, service: NovaLibService, parent: MainWindow) -> None:
        super().__init__()
        self.service = service
        self.parent_window = parent
        self._build()

    def _build(self) -> None:
        layout = QtWidgets.QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(12)

        top = QtWidgets.QHBoxLayout()
        top.addWidget(make_label("Member Management", "SectionTitle"))
        top.addStretch()
        self.search = QtWidgets.QLineEdit()
        self.search.setPlaceholderText("Search name, email, student ID, card")
        self.search.textChanged.connect(self.refresh)
        top.addWidget(self.search, 1)
        print_button = QtWidgets.QPushButton("Export Members PDF")
        print_button.clicked.connect(self._print_members)
        top.addWidget(print_button)
        layout.addLayout(top)

        split = QtWidgets.QSplitter(QtCore.Qt.Horizontal)
        layout.addWidget(split, 1)

        self.table = QtWidgets.QTableWidget()
        split.addWidget(self.table)

        panel = QtWidgets.QFrame()
        panel.setObjectName("Panel")
        panel.setMinimumWidth(340)
        split.addWidget(panel)

        form = QtWidgets.QFormLayout(panel)
        form.setContentsMargins(16, 16, 16, 16)
        form.setSpacing(10)

        self.name = QtWidgets.QLineEdit()
        self.email = QtWidgets.QLineEdit()
        self.phone = QtWidgets.QLineEdit()
        self.student_id = QtWidgets.QLineEdit()
        self.department = QtWidgets.QLineEdit()
        self.card = QtWidgets.QLineEdit()
        self.password = QtWidgets.QLineEdit()
        self.password.setEchoMode(QtWidgets.QLineEdit.Password)
        self.password.setText("member123")

        form.addRow("Name", self.name)
        form.addRow("Email", self.email)
        form.addRow("Phone", self.phone)
        form.addRow("Student ID", self.student_id)
        form.addRow("Department", self.department)
        form.addRow("Library card", self.card)
        form.addRow("Password", self.password)

        register = QtWidgets.QPushButton("Register Member")
        register.clicked.connect(self._register)
        form.addRow(register)

    def refresh(self) -> None:
        rows = self.service.list_members(self.search.text())
        set_table(
            self.table,
            ["ID", "Name", "Email", "Phone", "Student ID", "Department", "Card", "Loans", "Fines"],
            rows,
            [
                "id",
                "name",
                "email",
                "phone",
                "student_id",
                "department",
                "library_card_number",
                "active_loans",
                "unpaid_fines",
            ],
        )

    def _register(self) -> None:
        try:
            self.service.register_member(
                self.name.text(),
                self.email.text(),
                self.phone.text(),
                self.student_id.text(),
                self.department.text(),
                self.card.text(),
                self.password.text() or "member123",
            )
        except Exception as exc:
            message(self, str(exc), error=True)
            return
        for widget in [self.name, self.email, self.phone, self.student_id, self.department, self.card]:
            widget.clear()
        self.password.setText("member123")
        self.refresh()
        self.parent_window.pages["dashboard"].refresh()
        message(self, "Member registered")

    def _print_members(self) -> None:
        print_table(self, "Students / Members Report", self.table, school_subtitle(self.service))


class CirculationPage(QtWidgets.QWidget):
    def __init__(self, service: NovaLibService, parent: MainWindow, librarian_id: int) -> None:
        super().__init__()
        self.service = service
        self.parent_window = parent
        self.librarian_id = librarian_id
        self._build()

    def _build(self) -> None:
        layout = QtWidgets.QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(12)
        layout.addWidget(make_label("Circulation", "SectionTitle"))

        tabs = QtWidgets.QTabWidget()
        layout.addWidget(tabs)

        tabs.addTab(self._lookup_tab(), "Find Book")
        tabs.addTab(self._checkout_tab(), "Check-out")
        tabs.addTab(self._return_tab(), "Return")
        tabs.addTab(self._renew_tab(), "Renew")
        tabs.addTab(self._reserve_tab(), "Reserve")

        self.loans_table = QtWidgets.QTableWidget()
        layout.addWidget(self.loans_table, 1)

    def _lookup_tab(self) -> QtWidgets.QWidget:
        tab = QtWidgets.QWidget()
        layout = QtWidgets.QVBoxLayout(tab)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(10)

        controls = QtWidgets.QHBoxLayout()
        self.lookup_search = QtWidgets.QLineEdit()
        self.lookup_search.setPlaceholderText("Book name, subject, author, shelf, or ISBN")
        self.lookup_search.textChanged.connect(self.refresh_lookup)
        controls.addWidget(self.lookup_search, 1)

        self.lookup_level = QtWidgets.QComboBox()
        self.lookup_level.setEditable(True)
        self.lookup_level.addItems(LEVEL_OPTIONS)
        self.lookup_level.currentTextChanged.connect(self.refresh_lookup)
        controls.addWidget(self.lookup_level)

        use_button = QtWidgets.QPushButton("Use Selected")
        use_button.clicked.connect(self._use_lookup_selection)
        controls.addWidget(use_button)
        layout.addLayout(controls)

        self.lookup_table = QtWidgets.QTableWidget()
        self.lookup_table.cellDoubleClicked.connect(lambda row, column: self._use_lookup_selection())
        layout.addWidget(self.lookup_table, 1)
        return tab

    def _checkout_tab(self) -> QtWidgets.QWidget:
        tab = QtWidgets.QWidget()
        form = QtWidgets.QFormLayout(tab)
        form.setContentsMargins(16, 16, 16, 16)
        self.checkout_member = QtWidgets.QLineEdit()
        self.checkout_member.setPlaceholderText("Student ID, card, email, member ID, or name")
        self.checkout_barcode = QtWidgets.QLineEdit()
        self.checkout_barcode.setPlaceholderText("Book barcode, or choose an available book in Find Book")
        button = QtWidgets.QPushButton("Check-out Book")
        button.clicked.connect(self._checkout)
        form.addRow("Member", self.checkout_member)
        form.addRow("Book item", self.checkout_barcode)
        form.addRow(button)
        return tab

    def _return_tab(self) -> QtWidgets.QWidget:
        tab = QtWidgets.QWidget()
        form = QtWidgets.QFormLayout(tab)
        form.setContentsMargins(16, 16, 16, 16)
        self.return_barcode = QtWidgets.QLineEdit()
        self.return_barcode.setPlaceholderText("Book barcode")
        button = QtWidgets.QPushButton("Return Book")
        button.clicked.connect(self._return)
        form.addRow("Barcode", self.return_barcode)
        form.addRow(button)
        return tab

    def _renew_tab(self) -> QtWidgets.QWidget:
        tab = QtWidgets.QWidget()
        form = QtWidgets.QFormLayout(tab)
        form.setContentsMargins(16, 16, 16, 16)
        self.renew_lending = QtWidgets.QSpinBox()
        self.renew_lending.setRange(1, 999999)
        button = QtWidgets.QPushButton("Renew Book")
        button.clicked.connect(self._renew)
        form.addRow("Lending ID", self.renew_lending)
        form.addRow(button)
        return tab

    def _reserve_tab(self) -> QtWidgets.QWidget:
        tab = QtWidgets.QWidget()
        form = QtWidgets.QFormLayout(tab)
        form.setContentsMargins(16, 16, 16, 16)
        self.reserve_book_id = QtWidgets.QSpinBox()
        self.reserve_book_id.setRange(1, 999999)
        self.reserve_member = QtWidgets.QLineEdit()
        self.reserve_member.setPlaceholderText("Student ID, card, email, member ID, or name")
        button = QtWidgets.QPushButton("Reserve Book")
        button.clicked.connect(self._reserve)
        form.addRow("Book ID", self.reserve_book_id)
        form.addRow("Member", self.reserve_member)
        form.addRow(button)
        return tab

    def refresh(self) -> None:
        self.refresh_lookup()
        rows = self.service.list_active_loans()
        set_table(
            self.loans_table,
            ["Lending ID", "Member", "Student ID", "Title", "Subject", "Level", "Shelf", "Barcode", "Checkout", "Due", "Status"],
            rows,
            [
                "id",
                "member",
                "student_id",
                "title",
                "subject",
                "class_level",
                "shelf",
                "barcode",
                "checkout_date",
                "due_date",
                "status",
            ],
        )

    def refresh_lookup(self) -> None:
        if not hasattr(self, "lookup_table"):
            return
        rows = self.service.locate_books(self.lookup_search.text(), self.lookup_level.currentText())
        set_table(
            self.lookup_table,
            ["Book ID", "Title", "Subject", "Level", "Available", "Total", "Shelf", "Available Barcode"],
            rows,
            [
                "book_id",
                "title",
                "subject",
                "class_level",
                "copies_available",
                "copies_total",
                "shelves",
                "available_barcode",
            ],
        )

    def _use_lookup_selection(self) -> None:
        row = self.lookup_table.currentRow()
        if row < 0:
            message(self, "Select a book from the Find Book list first", error=True)
            return

        def cell(column: int) -> str:
            item = self.lookup_table.item(row, column)
            return item.text() if item else ""

        book_id = cell(0)
        title = cell(1)
        shelf = cell(6)
        barcode = cell(7)
        if book_id:
            self.reserve_book_id.setValue(int(book_id))
        if barcode:
            self.checkout_barcode.setText(barcode)
            message(self, f"{title} is available on shelf {shelf}. Barcode copied for checkout.")
        else:
            message(self, f"{title} is not available now. Book ID {book_id} is ready for reservation.")

    def _checkout(self) -> None:
        try:
            result = self.service.checkout_book(
                self.checkout_member.text(),
                self.checkout_barcode.text(),
                self.librarian_id,
            )
        except NovaLibError as exc:
            message(self, str(exc), error=True)
            return
        self.checkout_barcode.clear()
        self.refresh_all()
        message(self, result.message)

    def _return(self) -> None:
        try:
            result = self.service.return_book(self.return_barcode.text(), self.librarian_id)
        except NovaLibError as exc:
            message(self, str(exc), error=True)
            return
        self.return_barcode.clear()
        self.refresh_all()
        message(self, result.message)

    def _renew(self) -> None:
        try:
            result = self.service.renew_book(self.renew_lending.value(), self.librarian_id)
        except NovaLibError as exc:
            message(self, str(exc), error=True)
            return
        self.refresh_all()
        message(self, result)

    def _reserve(self) -> None:
        try:
            reservation_id = self.service.reserve_book(
                self.reserve_book_id.value(),
                self.reserve_member.text(),
                self.librarian_id,
            )
        except NovaLibError as exc:
            message(self, str(exc), error=True)
            return
        self.refresh_all()
        message(self, f"Reservation created: {reservation_id}")

    def refresh_all(self) -> None:
        for page in self.parent_window.pages.values():
            if hasattr(page, "refresh"):
                page.refresh()


class SettingsPage(QtWidgets.QWidget):
    def __init__(self, service: NovaLibService, parent: MainWindow) -> None:
        super().__init__()
        self.service = service
        self.parent_window = parent
        self._build()

    def _build(self) -> None:
        layout = QtWidgets.QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(12)
        layout.addWidget(make_label("Admin Settings", "SectionTitle"))

        tabs = QtWidgets.QTabWidget()
        layout.addWidget(tabs, 1)
        tabs.addTab(self._school_tab(), "School Profile")
        tabs.addTab(self._admins_tab(), "Admins")
        tabs.addTab(self._preferences_tab(), "Themes & Password")

    def _school_tab(self) -> QtWidgets.QWidget:
        tab = QtWidgets.QWidget()
        layout = QtWidgets.QVBoxLayout(tab)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(12)

        panel = QtWidgets.QFrame()
        panel.setObjectName("Panel")
        layout.addWidget(panel)
        layout.addStretch()

        school_form = QtWidgets.QFormLayout(panel)
        school_form.setContentsMargins(16, 16, 16, 16)
        school_form.setSpacing(10)
        self.school_name = QtWidgets.QLineEdit()
        self.school_address = QtWidgets.QLineEdit()
        self.logo_path = QtWidgets.QLineEdit()
        self.logo_preview = QtWidgets.QLabel()
        self.logo_preview.setFixedSize(96, 96)
        self.logo_preview.setAlignment(QtCore.Qt.AlignCenter)

        choose_logo = QtWidgets.QPushButton("Choose Logo")
        choose_logo.clicked.connect(self._choose_logo)
        save_school = QtWidgets.QPushButton("Save School Profile")
        save_school.clicked.connect(self._save_school)

        logo_row = QtWidgets.QHBoxLayout()
        logo_row.addWidget(self.logo_path, 1)
        logo_row.addWidget(choose_logo)

        school_form.addRow("School name", self.school_name)
        school_form.addRow("Address", self.school_address)
        school_form.addRow("Logo/photo", logo_row)
        school_form.addRow("Preview", self.logo_preview)
        school_form.addRow(save_school)
        return tab

    def _admins_tab(self) -> QtWidgets.QWidget:
        tab = QtWidgets.QWidget()
        admin_layout = QtWidgets.QVBoxLayout(tab)
        admin_layout.setContentsMargins(16, 16, 16, 16)
        admin_layout.setSpacing(12)
        admin_layout.addWidget(make_label("Admins / Librarians", "SectionTitle"))

        self.librarian_table = QtWidgets.QTableWidget()
        admin_layout.addWidget(self.librarian_table, 1)

        form = QtWidgets.QFormLayout()
        self.admin_name = QtWidgets.QLineEdit()
        self.admin_email = QtWidgets.QLineEdit()
        self.admin_phone = QtWidgets.QLineEdit()
        self.admin_password = QtWidgets.QLineEdit()
        self.admin_password.setEchoMode(QtWidgets.QLineEdit.Password)
        self.admin_password.setText("admin123")
        form.addRow("Name", self.admin_name)
        form.addRow("Email", self.admin_email)
        form.addRow("Phone", self.admin_phone)
        form.addRow("Password", self.admin_password)
        admin_layout.addLayout(form)

        add_admin = QtWidgets.QPushButton("Add Admin/Librarian")
        add_admin.clicked.connect(self._add_librarian)
        admin_layout.addWidget(add_admin)
        return tab

    def _preferences_tab(self) -> QtWidgets.QWidget:
        tab = QtWidgets.QWidget()
        layout = QtWidgets.QHBoxLayout(tab)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(14)

        theme_panel = QtWidgets.QFrame()
        theme_panel.setObjectName("Panel")
        layout.addWidget(theme_panel, 1)
        theme_form = QtWidgets.QFormLayout(theme_panel)
        theme_form.setContentsMargins(16, 16, 16, 16)
        theme_form.setSpacing(10)

        self.theme_combo = QtWidgets.QComboBox()
        for key, name in theme_options():
            self.theme_combo.addItem(name, key)
        apply_theme = QtWidgets.QPushButton("Apply Theme")
        apply_theme.clicked.connect(self._save_theme)

        theme_form.addRow(make_label("Themes", "SectionTitle"))
        theme_form.addRow("Style", self.theme_combo)
        theme_form.addRow(apply_theme)

        password_panel = QtWidgets.QFrame()
        password_panel.setObjectName("Panel")
        layout.addWidget(password_panel, 1)
        password_form = QtWidgets.QFormLayout(password_panel)
        password_form.setContentsMargins(16, 16, 16, 16)
        password_form.setSpacing(10)

        self.current_password = QtWidgets.QLineEdit()
        self.current_password.setEchoMode(QtWidgets.QLineEdit.Password)
        self.new_password = QtWidgets.QLineEdit()
        self.new_password.setEchoMode(QtWidgets.QLineEdit.Password)
        self.confirm_password = QtWidgets.QLineEdit()
        self.confirm_password.setEchoMode(QtWidgets.QLineEdit.Password)

        change_password = QtWidgets.QPushButton("Change Password")
        change_password.clicked.connect(self._change_password)

        password_form.addRow(make_label("Admin Password", "SectionTitle"))
        password_form.addRow("Current password", self.current_password)
        password_form.addRow("New password", self.new_password)
        password_form.addRow("Confirm password", self.confirm_password)
        password_form.addRow(change_password)
        return tab

    def refresh(self) -> None:
        profile = self.service.get_school_profile()
        self.school_name.setText(profile["name"])
        self.school_address.setText(profile["address"])
        self.logo_path.setText(profile.get("logo_path", ""))
        self._set_logo_preview(profile.get("logo_path", ""))
        self._set_current_theme(self.service.get_theme_key())
        set_table(
            self.librarian_table,
            ["ID", "Name", "Email", "Phone", "Active", "Created"],
            self.service.list_librarians(),
            ["id", "name", "email", "phone", "is_active", "created_at"],
        )

    def _choose_logo(self) -> None:
        path, _ = QtWidgets.QFileDialog.getOpenFileName(
            self,
            "Choose school logo/photo",
            "",
            "Images (*.png *.jpg *.jpeg *.bmp)",
        )
        if path:
            self.logo_path.setText(path)
            self._set_logo_preview(path)

    def _save_school(self) -> None:
        try:
            self.service.update_school_profile(
                self.school_name.text(),
                self.school_address.text(),
                self.logo_path.text(),
            )
        except NovaLibError as exc:
            message(self, str(exc), error=True)
            return
        self.parent_window.school_title_label.setText(self.school_name.text().strip())
        self.parent_window.pages["dashboard"].refresh()
        message(self, "School profile saved")

    def _set_current_theme(self, theme_key: str) -> None:
        index = self.theme_combo.findData(theme_key)
        if index < 0:
            index = self.theme_combo.findData("classic_teal")
        if index >= 0:
            self.theme_combo.setCurrentIndex(index)

    def _save_theme(self) -> None:
        theme_key = self.theme_combo.currentData()
        try:
            self.service.update_theme(str(theme_key))
        except NovaLibError as exc:
            message(self, str(exc), error=True)
            return
        self.parent_window.apply_theme(str(theme_key))
        message(self, "Theme applied")

    def _change_password(self) -> None:
        try:
            self.service.change_password(
                int(self.parent_window.account["id"]),
                self.current_password.text(),
                self.new_password.text(),
                self.confirm_password.text(),
            )
        except NovaLibError as exc:
            message(self, str(exc), error=True)
            return
        self.current_password.clear()
        self.new_password.clear()
        self.confirm_password.clear()
        message(self, "Password changed")

    def _add_librarian(self) -> None:
        try:
            self.service.create_librarian(
                self.admin_name.text(),
                self.admin_email.text(),
                self.admin_phone.text(),
                self.admin_password.text(),
            )
        except Exception as exc:
            message(self, str(exc), error=True)
            return
        for widget in [self.admin_name, self.admin_email, self.admin_phone]:
            widget.clear()
        self.admin_password.setText("admin123")
        self.refresh()
        message(self, "Admin/librarian account created")

    def _set_logo_preview(self, path: str) -> None:
        pixmap = QtGui.QPixmap(path) if path else QtGui.QPixmap()
        if pixmap.isNull():
            self.logo_preview.setText("No logo")
            self.logo_preview.setPixmap(QtGui.QPixmap())
            return
        self.logo_preview.setText("")
        self.logo_preview.setPixmap(
            pixmap.scaled(96, 96, QtCore.Qt.KeepAspectRatio, QtCore.Qt.SmoothTransformation)
        )


class ReservationsPage(QtWidgets.QWidget):
    def __init__(self, service: NovaLibService, parent: MainWindow) -> None:
        super().__init__()
        self.service = service
        self._build()

    def _build(self) -> None:
        layout = QtWidgets.QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        top = QtWidgets.QHBoxLayout()
        top.addWidget(make_label("Requested Books", "SectionTitle"))
        top.addStretch()
        print_button = QtWidgets.QPushButton("Export Requests PDF")
        print_button.clicked.connect(self._print_reservations)
        top.addWidget(print_button)
        layout.addLayout(top)
        self.table = QtWidgets.QTableWidget()
        layout.addWidget(self.table, 1)

    def refresh(self) -> None:
        set_table(
            self.table,
            ["ID", "Date", "Status", "Member", "Student ID", "Title", "Subject", "Level", "Available", "Action"],
            self.service.list_reservations(),
            [
                "id",
                "creation_date",
                "status",
                "member",
                "student_id",
                "title",
                "subject",
                "class_level",
                "copies_available",
                "purchase_note",
            ],
        )

    def _print_reservations(self) -> None:
        print_table(self, "Requested Books / Purchase List", self.table, school_subtitle(self.service))


class FinesPage(QtWidgets.QWidget):
    def __init__(self, service: NovaLibService, parent: MainWindow) -> None:
        super().__init__()
        self.service = service
        self._build()

    def _build(self) -> None:
        layout = QtWidgets.QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        top = QtWidgets.QHBoxLayout()
        top.addWidget(make_label("Fines", "SectionTitle"))
        top.addStretch()
        print_button = QtWidgets.QPushButton("Export Fines PDF")
        print_button.clicked.connect(self._print_fines)
        top.addWidget(print_button)
        layout.addLayout(top)
        self.table = QtWidgets.QTableWidget()
        layout.addWidget(self.table, 1)

    def refresh(self) -> None:
        set_table(
            self.table,
            ["ID", "Amount", "Date", "Status", "Member", "Student ID", "Title", "Subject", "Level", "Barcode", "Due", "Returned"],
            self.service.list_fines(),
            [
                "id",
                "amount",
                "date",
                "status",
                "member",
                "student_id",
                "title",
                "subject",
                "class_level",
                "barcode",
                "due_date",
                "return_date",
            ],
        )

    def _print_fines(self) -> None:
        print_table(self, "Fines Report", self.table, school_subtitle(self.service))


def message(parent: QtWidgets.QWidget, text: str, error: bool = False) -> None:
    icon = QtWidgets.QMessageBox.Warning if error else QtWidgets.QMessageBox.Information
    QtWidgets.QMessageBox(icon, __app_name__, text, QtWidgets.QMessageBox.Ok, parent).exec_()
