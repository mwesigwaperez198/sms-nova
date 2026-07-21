from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.incident import Incident
from app.models.user import User

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get("/")
def list_incidents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Incident)
    if current_user.school_id:
        q = q.filter(Incident.school_id == current_user.school_id)
    return q.order_by(Incident.id.desc()).limit(50).all()


@router.post("/")
def create_incident(
    title: str,
    description: str = "",
    severity: str = "info",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inc = Incident(
        title=title,
        description=description,
        severity=severity,
        reported_by=current_user.id,
        school_id=current_user.school_id,
    )
    db.add(inc)
    db.commit()
    db.refresh(inc)
    return inc


@router.patch("/{incident_id}")
def update_incident(
    incident_id: int,
    status: str | None = None,
    severity: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(404, "Incident not found")
    if current_user.school_id and inc.school_id != current_user.school_id:
        raise HTTPException(404, "Incident not found")
    if status:
        inc.status = status
        if status == "resolved":
            inc.resolved_at = datetime.utcnow()
    if severity:
        inc.severity = severity
    db.commit()
    return {"msg": "updated"}
