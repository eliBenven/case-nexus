"""Data models for Case Nexus."""

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Case:
    id: int
    case_number: str
    defendant_name: str
    charges: list[str]
    severity: str  # felony, misdemeanor
    status: str  # active, plea_pending, trial_scheduled, closed, bench_warrant
    court: str
    judge: str
    prosecutor: str
    next_hearing_date: str | None = None
    hearing_type: str | None = None
    filing_date: str = ""
    arrest_date: str = ""
    evidence_summary: str = ""
    notes: str = ""
    attorney_notes: str = ""
    plea_offer: str | None = None
    plea_offer_details: str | None = None
    disposition: str | None = None
    arresting_officer: str = ""
    precinct: str = ""
    witnesses: str = ""  # JSON string of witness list
    prior_record: str = ""
    bond_status: str = ""
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class Alert:
    id: int
    case_id: int | None
    case_number: str
    alert_type: str  # deadline, speedy_trial, discovery, pattern, connection, strategy
    severity: str  # critical, warning, info
    title: str
    message: str
    details: str = ""
    dismissed: bool = False
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class Connection:
    id: int
    case_numbers: list[str]
    connection_type: str  # officer, witness, jurisdiction, pattern, precedent
    title: str
    description: str
    confidence: float = 0.0
    actionable: str = ""
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
