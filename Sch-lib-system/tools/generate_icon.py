from __future__ import annotations

import struct
from pathlib import Path

from PyQt5 import QtCore, QtGui, QtSvg


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "novalib" / "assets"
SVG_PATH = ASSET_DIR / "novalib-icon.svg"
PNG_PATH = ASSET_DIR / "novalib-icon.png"
ICO_PATH = ASSET_DIR / "novalib-icon.ico"
ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]


def render_svg(size: int) -> QtGui.QImage:
    renderer = QtSvg.QSvgRenderer(str(SVG_PATH))
    if not renderer.isValid():
        raise RuntimeError(f"Could not render {SVG_PATH}")

    image = QtGui.QImage(size, size, QtGui.QImage.Format_ARGB32)
    image.fill(QtCore.Qt.transparent)
    painter = QtGui.QPainter(image)
    painter.setRenderHint(QtGui.QPainter.Antialiasing)
    renderer.render(painter)
    painter.end()
    return image


def image_to_png_bytes(image: QtGui.QImage) -> bytes:
    payload = QtCore.QByteArray()
    buffer = QtCore.QBuffer(payload)
    buffer.open(QtCore.QIODevice.WriteOnly)
    if not image.save(buffer, "PNG"):
        raise RuntimeError("Could not encode PNG icon frame")
    return bytes(payload)


def write_ico(frames: list[tuple[int, bytes]]) -> None:
    header = struct.pack("<HHH", 0, 1, len(frames))
    directory = bytearray()
    data = bytearray()
    offset = 6 + (16 * len(frames))

    for size, payload in frames:
        directory.extend(
            struct.pack(
                "<BBBBHHII",
                0 if size == 256 else size,
                0 if size == 256 else size,
                0,
                0,
                1,
                32,
                len(payload),
                offset,
            )
        )
        data.extend(payload)
        offset += len(payload)

    ICO_PATH.write_bytes(header + directory + data)


def main() -> None:
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    render_svg(1024).save(str(PNG_PATH), "PNG")
    frames = [(size, image_to_png_bytes(render_svg(size))) for size in ICO_SIZES]
    write_ico(frames)
    print(f"Wrote {PNG_PATH}")
    print(f"Wrote {ICO_PATH}")


if __name__ == "__main__":
    main()
