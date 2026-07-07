from pydantic import BaseModel


class AdminOverviewRead(BaseModel):
    school_id: int
    users_count: int
    students_count: int
    teachers_count: int
    parents_count: int
    total_invoiced: str
    total_paid: str
    outstanding_balance: str
    attendance_records_count: int
    report_cards_count: int
    notifications_count: int


class AnalyticsRead(BaseModel):
    school_id: int
    fees: dict
    attendance: dict
    report_cards: dict
