import base64
import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

_DEEPFACE_AVAILABLE: bool | None = None


def _is_available() -> bool:
    global _DEEPFACE_AVAILABLE
    if _DEEPFACE_AVAILABLE is None:
        try:
            import cv2  # noqa: F401
            import numpy as np  # noqa: F401
            from deepface import DeepFace  # noqa: F401

            _DEEPFACE_AVAILABLE = True
        except Exception:
            _DEEPFACE_AVAILABLE = False
            logger.warning("deepface/cv2 not available — facial recognition disabled")
    return _DEEPFACE_AVAILABLE


def _decode_image(data_url: str) -> Any:
    import cv2
    import numpy as np

    if "," in data_url:
        data_url = data_url.split(",", 1)[1]
    img_bytes = base64.b64decode(data_url)
    np_arr = np.frombuffer(img_bytes, np.uint8)
    return cv2.imdecode(np_arr, cv2.IMREAD_COLOR)


def extract_embedding(data_url: str) -> list[float] | None:
    if not _is_available():
        return None
    from deepface import DeepFace

    try:
        img = _decode_image(data_url)
        if img is None:
            return None
        if img.size == 0:
            return None
        embedding = DeepFace.represent(img, model_name="Facenet", enforce_detection=False)
        if isinstance(embedding, list) and len(embedding) > 0:
            emb = embedding[0].get("embedding")
            if emb is not None:
                return emb.tolist() if hasattr(emb, "tolist") else list(emb)
        return None
    except Exception as exc:
        logger.warning("Face embedding extraction failed: %s", exc)
        return None


def verify_face(data_url: str, stored_encoding: str, threshold: float = 0.4) -> bool:
    stored = json.loads(stored_encoding)
    current = extract_embedding(data_url)
    if current is None:
        return False
    try:
        import numpy as np

        a = np.array(stored)
        b = np.array(current)
        dist = np.linalg.norm(a - b)
        return float(dist) < threshold
    except Exception as exc:
        logger.warning("Face verification failed: %s", exc)
        return False
