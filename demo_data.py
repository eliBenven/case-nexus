"""Demo caseload data for Case Nexus.

Generates a realistic caseload of 500 criminal cases for a public defender's
office in the Atlanta/Fulton County, Georgia area. Includes 15 hand-crafted
"key" cases with cross-connections that an AI assistant should discover.

Key case groups:
  1. Speedy trial risk (CR-2025-0047, CR-2025-0163)
  2. Same officer, contested searches — Officer J. Rodriguez (CR-2025-0012, 0089, 0142, 0155)
  3. Plea offer disparity — similar assault cases (CR-2025-0023, 0056, 0078)
  4. Shared witness / impeachment opportunity (CR-2025-0101, 0033)
  5. Same officer with IAB complaint — Det. Michael Harris (CR-2025-0015, 0067, 0118)
  6. Discovery deadline approaching (CR-2025-0134)
"""

import json
import random
from datetime import datetime, timedelta


# ---------------------------------------------------------------------------
# Data pools
# ---------------------------------------------------------------------------

FIRST_NAMES = [
    "James", "Robert", "Michael", "David", "William", "Richard", "Joseph",
    "Thomas", "Christopher", "Daniel", "Marcus", "Antonio", "Tyrone",
    "DeShawn", "Omar", "Carlos", "Andre", "Jerome", "Malik", "Terrence",
    "Brian", "Kevin", "Eric", "Steven", "Raymond", "Larry", "Gerald",
    "Timothy", "Patrick", "Gregory", "Mary", "Patricia", "Jennifer",
    "Linda", "Maria", "Sarah", "Keisha", "Latoya", "Jasmine", "Angela",
    "Tamika", "Crystal", "Brittany", "Destiny", "Aaliyah", "Monique",
    "Vanessa", "Tiffany", "Nicole", "Stephanie",
]

LAST_NAMES = [
    "Williams", "Johnson", "Brown", "Jones", "Davis", "Wilson", "Anderson",
    "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson", "Garcia",
    "Martinez", "Robinson", "Clark", "Rodriguez", "Lewis", "Lee", "Walker",
    "Hall", "Allen", "Young", "King", "Wright", "Scott", "Green", "Baker",
    "Adams", "Nelson", "Carter", "Mitchell", "Perez", "Roberts", "Turner",
    "Phillips", "Campbell", "Parker", "Evans", "Edwards", "Collins",
    "Stewart", "Morris", "Reed", "Chen", "Kim", "Patel", "Santos", "Hassan",
]

COURTS = [
    "Fulton County Superior Court",
    "Atlanta Municipal Court",
    "DeKalb County State Court",
    "Fulton County Magistrate Court",
    "Cobb County Superior Court",
    "Gwinnett County State Court",
    "Clayton County Superior Court",
    "South Fulton Municipal Court",
]

JUDGES = [
    "Hon. Patricia Williams",
    "Hon. David Kim",
    "Hon. Robert Franklin",
    "Hon. Carolyn Hughes",
    "Hon. Marcus Washington",
    "Hon. Elena Rodriguez",
    "Hon. Thomas Whitfield",
    "Hon. Sandra Mitchell",
    "Hon. Richard Okonkwo",
    "Hon. Diane Patel",
]

PROSECUTORS = [
    "ADA Karen Mitchell",
    "ADA Brian Foster",
    "ADA Natalie Park",
    "ADA Derek Robinson",
    "ADA Stephanie Weiss",
    "ADA Marcus Grant",
    "ADA Lisa Chung",
    "ADA Robert Hayes",
]

OFFICERS = [
    "Officer T. Bradley",
    "Officer M. Nguyen",
    "Officer J. Rodriguez",
    "Officer S. Patel",
    "Officer K. O'Brien",
    "Officer D. Washington",
    "Det. Michael Harris",
    "Officer R. Simmons",
    "Officer A. Dominguez",
    "Officer L. Freeman",
    "Det. Sarah Chen",
    "Officer W. McKinnon",
]

PRECINCTS = [
    "Precinct 3",
    "Precinct 7",
    "Precinct 11",
    "Precinct 14",
    "District 2",
    "District 5",
]

MISDEMEANOR_CHARGES = [
    "Simple Assault",
    "Simple Battery",
    "Misdemeanor Theft",
    "Shoplifting",
    "Disorderly Conduct",
    "Criminal Trespass",
    "DUI",
    "DUI - Under the Influence",
    "Marijuana Possession (less than 1 oz)",
    "Possession of Controlled Substance",
    "Driving on Suspended License",
    "Reckless Driving",
    "Vandalism",
    "Public Intoxication",
    "Petit Larceny",
    "Giving False Information to Police",
    "Loitering",
    "Obstruction of a Law Enforcement Officer",
    "Domestic Battery (Misdemeanor)",
    "Harassing Communications",
]

FELONY_CHARGES = [
    "Aggravated Assault",
    "Aggravated Battery",
    "Armed Robbery",
    "Robbery",
    "Burglary - First Degree",
    "Burglary - Second Degree",
    "Possession with Intent to Distribute",
    "Trafficking Cocaine",
    "Trafficking Methamphetamine",
    "Felony DUI (Fourth Offense)",
    "Theft by Taking (Felony)",
    "Identity Fraud",
    "Forgery - First Degree",
    "Weapons Possession (Convicted Felon)",
    "Aggravated Stalking",
    "Vehicular Homicide",
    "Child Cruelty",
    "Fleeing and Eluding",
    "Felony Domestic Violence",
    "Entering Automobile",
]

HEARING_TYPES = [
    "Status Conference",
    "Preliminary Hearing",
    "Trial",
    "Sentencing",
    "Arraignment",
    "Motions Hearing",
    "Bond Hearing",
    "Calendar Call",
]

EVIDENCE_TEMPLATES = [
    "Police report documents {detail}. {witness_info}. {physical_evidence}.",
    "{physical_evidence}. Responding officer noted {detail}. {witness_info}.",
    "{witness_info}. {physical_evidence}. Officer body cam shows {detail}.",
    "Incident occurred at {location}. {physical_evidence}. {witness_info}.",
    "Defendant was apprehended at {location}. {detail}. {physical_evidence}.",
]

EVIDENCE_DETAILS = [
    "defendant was found at the scene",
    "defendant matched description given by witnesses",
    "verbal altercation preceded the incident",
    "defendant was found in possession of stolen items",
    "defendant failed field sobriety test",
    "blood alcohol level measured at 0.14",
    "blood alcohol level measured at 0.11",
    "defendant was observed making hand-to-hand transaction",
    "surveillance footage captures defendant at the location",
    "defendant admitted to being present at the scene",
    "defendant fled on foot and was apprehended two blocks away",
    "defendant was found sleeping in the vehicle with engine running",
    "property owner identified defendant from photo lineup",
    "defendant was identified by store loss prevention",
    "neighbors reported hearing a loud argument before police arrived",
]

WITNESS_INFO_TEMPLATES = [
    "One civilian witness provided a statement",
    "Two witnesses corroborate the officer's account",
    "Victim provided a written statement at the scene",
    "No independent witnesses have come forward",
    "Store employee witnessed the incident",
    "Bystander called 911 and provided a statement",
    "Victim identified defendant from a photo array",
    "Multiple witnesses gave conflicting accounts",
    "Neighbor witnessed the incident from across the street",
    "Security guard provided a statement",
]

PHYSICAL_EVIDENCE = [
    "Surveillance footage recovered from nearby business",
    "Officer recovered a knife from the scene",
    "Drug field test returned presumptive positive",
    "Fingerprints recovered from point of entry",
    "DNA sample collected and sent to crime lab",
    "Recovered stolen merchandise valued at $1,200",
    "Recovered stolen merchandise valued at $450",
    "Vehicle dashcam footage available",
    "Medical records document victim's injuries",
    "Photographs of property damage on file",
    "Controlled substance submitted to crime lab for analysis",
    "Cell phone records subpoenaed",
    "Body camera footage is available and has been reviewed",
    "Shell casings recovered at the scene",
    "Defendant's clothing seized as evidence",
]

LOCATIONS = [
    "a convenience store on Peachtree St",
    "a gas station on Memorial Dr",
    "an apartment complex on MLK Jr Blvd",
    "a parking lot off Ponce de Leon Ave",
    "a residence on Cascade Rd",
    "a shopping center on Camp Creek Pkwy",
    "an intersection near Five Points",
    "a bar on Edgewood Ave",
    "a residence in Bankhead",
    "a vehicle on I-285",
    "a restaurant on Buford Hwy",
    "a motel on Fulton Industrial Blvd",
]

NOTES_TEMPLATES = [
    "Client appeared for last hearing on time. {extra}",
    "Need to follow up with {task}. {extra}",
    "Client is currently {situation}. {extra}",
    "{situation}. Need to follow up with {task}.",
    "Discovery received on {disc_date}. {extra}",
    "Spoke with client on {contact_date}. {extra}",
    "Case transferred from previous attorney. {extra}",
]

NOTES_EXTRAS = [
    "Client has stable employment.",
    "Client is enrolled in substance abuse program.",
    "Client has no prior convictions.",
    "Client is a single parent with two children.",
    "Client has been cooperative throughout.",
    "Client missed one check-in but provided documentation.",
    "Family is supportive and present at hearings.",
    "Client is currently unemployed and seeking work.",
    "Client completed community service hours.",
    "Client is on probation for an unrelated matter.",
    "Interpreter needed for court appearances.",
    "Client has expressed interest in diversion program.",
    "Mental health evaluation has been ordered.",
    "Client was referred to social services.",
]

NOTES_TASKS = [
    "the crime lab regarding evidence processing timeline",
    "the DA's office regarding outstanding discovery",
    "defendant's employer for character reference letter",
    "potential alibi witnesses",
    "the pretrial services officer",
    "obtaining medical records",
    "reviewing body camera footage",
    "filing motion to suppress",
    "scheduling client meeting to discuss plea options",
    "contacting victim's attorney about restitution",
]

NOTES_SITUATIONS = [
    "Client is out on bond and compliant with all conditions",
    "Client remains in custody at Fulton County Jail",
    "Client posted bond last week",
    "Client was released on recognizance",
    "Client is in a residential treatment facility",
    "Client is residing with family in East Atlanta",
    "Client is in compliance with pretrial supervision",
]

ATTORNEY_NOTES_TEMPLATES = [
    "Reviewed discovery materials. {observation}. {strategy}.",
    "{observation}. {strategy}. Will discuss with client at next meeting.",
    "Met with client on {date}. {observation}. {strategy}.",
    "{strategy}. {observation}. Need to evaluate further before next hearing.",
    "Case has potential issues: {observation}. Recommended approach: {strategy}.",
]

ATTORNEY_OBSERVATIONS = [
    "State's evidence is primarily circumstantial",
    "Witness identification may be unreliable due to poor lighting conditions",
    "Client's account is consistent with available evidence",
    "There are gaps in the chain of custody for physical evidence",
    "Officer's report contains inconsistencies regarding timeline",
    "Client has strong ties to the community",
    "Victim has a history of making similar allegations",
    "Video footage does not clearly show defendant's face",
    "Client was cooperative during arrest",
    "State's case relies heavily on a single witness",
    "Toxicology results may be challenged on procedural grounds",
    "There may be a viable self-defense argument",
    "The search may have been conducted without proper authorization",
    "Client's statement to police was made without Miranda warnings",
    "Multiple co-defendants may create Bruton issues at trial",
]

ATTORNEY_STRATEGIES = [
    "Consider filing motion to suppress physical evidence",
    "Pursue plea negotiations given strength of state's case",
    "Prepare for trial — facts favor the defense",
    "Explore diversion program eligibility",
    "Request continuance to allow time for independent investigation",
    "File demand for speedy trial to pressure the state",
    "Challenge the identification procedure used",
    "Obtain independent expert to review forensic evidence",
    "Negotiate for reduced charges in exchange for cooperation",
    "Prepare motion challenging probable cause for arrest",
    "Need to interview defense witnesses before next hearing",
    "Consider requesting bench trial rather than jury",
    "Evaluate whether a Batson challenge may be warranted",
    "Prepare character witnesses for sentencing if needed",
]

PLEA_OFFERS = [
    "Time served",
    "12 months probation",
    "18 months probation",
    "2 years probation",
    "3 years probation",
    "5 years probation",
    "6 months county jail, balance probated",
    "12 months to serve, 4 years probation",
    "2 years to serve, 3 years probation",
    "3 years to serve, 7 years probation",
    "5 years, serve 2",
    "Nolo contendere with community service",
    "Conditional discharge with treatment program",
    "Diversion program",
    "30 days county jail, 12 months probation",
    "60 days county jail, 2 years probation",
]

PLEA_DETAILS_TEMPLATES = [
    "State offered {offer} in exchange for guilty plea to {charge}. {condition}.",
    "Offer contingent on {condition}. {extra}.",
    "{offer} with {condition}. Offer expires {expiry}.",
    "DA proposed {offer}. {condition}. {extra}.",
]

PLEA_CONDITIONS = [
    "completion of anger management program",
    "no contact with victim",
    "substance abuse treatment",
    "community service of 200 hours",
    "community service of 100 hours",
    "restitution to victim",
    "forfeiture of seized property",
    "surrender of firearms",
    "GPS monitoring for duration of probation",
    "random drug testing",
    "maintaining employment",
]

PRIOR_RECORDS = [
    "No prior criminal record.",
    "One prior misdemeanor conviction for disorderly conduct (2022). Completed probation successfully.",
    "Two prior misdemeanor convictions: DUI (2021) and simple battery (2023). Currently on probation for the battery.",
    "One prior felony conviction for burglary (2019). Served 18 months. Completed parole in 2022.",
    "Juvenile record sealed. No adult criminal history.",
    "Prior arrest for shoplifting (2023) — charges were dismissed.",
    "Three prior misdemeanor convictions over the past 5 years, including theft and disorderly conduct.",
    "One prior DUI conviction (2020). License was suspended for 12 months. No other record.",
    "Extensive misdemeanor history including multiple theft and trespass charges from 2018-2024.",
    "Prior felony drug conviction (2020). Completed drug court program. No violations since.",
    "Two prior arrests, no convictions. One dismissed, one nolle prossed.",
    "Prior domestic violence charge (2023) resulted in dismissal after victim recanted.",
    "Clean record. First-time offender.",
    "One prior simple assault conviction (2024). Sentenced to probation, currently compliant.",
    "Multiple traffic offenses. One prior DUI (2022). No violent criminal history.",
]

BOND_STATUSES = [
    "$2,500 surety bond",
    "$5,000 surety bond",
    "$7,500 surety bond",
    "$10,000 surety bond",
    "$15,000 surety bond",
    "$25,000 surety bond",
    "$50,000 surety bond",
    "$100,000 surety bond",
    "ROR",
    "ROR",
    "ROR",
    "Remanded",
    "$5,000 property bond",
    "$10,000 cash bond",
    "Pretrial release with GPS monitoring",
    "Signature bond",
]

# -- Enrichment pools for in-depth cases --

ADDRESSES = [
    "1247 Peachtree St NE, Apt 4B, Atlanta, GA 30309",
    "455 Boulevard SE, Atlanta, GA 30312",
    "2801 MLK Jr Dr SW, Atlanta, GA 30311",
    "189 Edgewood Ave NE, Atlanta, GA 30303",
    "3421 Camp Creek Pkwy, East Point, GA 30344",
    "772 Cascade Rd SW, Apt 12, Atlanta, GA 30311",
    "1090 Northside Dr NW, Atlanta, GA 30318",
    "508 Flat Shoals Ave SE, Atlanta, GA 30316",
    "2200 Candler Rd, Decatur, GA 30034",
    "945 Joseph E Boone Blvd, Atlanta, GA 30314",
    "1533 Memorial Dr SE, Atlanta, GA 30317",
    "4100 S Cobb Dr, Smyrna, GA 30080",
    "2710 Buford Hwy NE, Apt 208, Atlanta, GA 30324",
    "615 Holcomb Bridge Rd, Roswell, GA 30076",
    "830 Jonesboro Rd, Forest Park, GA 30297",
    "1422 Fulton Industrial Blvd, Atlanta, GA 30336",
    "No fixed address — currently staying at Atlanta Mission shelter",
    "No fixed address — staying with family in Bankhead",
    "3008 Glenwood Rd SE, Decatur, GA 30032",
    "175 Luckie St NW, Apt 1109, Atlanta, GA 30303",
]

EMPLOYMENTS = [
    "Employed — warehouse worker at Amazon fulfillment center, Lithia Springs",
    "Employed — line cook at Waffle House, Peachtree St",
    "Employed — delivery driver for DoorDash (gig work)",
    "Employed — construction laborer, Turner Construction",
    "Employed — security guard at Atlantic Station mall",
    "Employed — Lyft driver (part-time)",
    "Employed — cashier at QuikTrip gas station",
    "Employed — auto mechanic at Pep Boys, Decatur",
    "Employed — home health aide, Comfort Keepers",
    "Employed — barber at Fresh Cuts, Bankhead",
    "Unemployed — laid off from manufacturing job 3 months ago",
    "Unemployed — seeking employment",
    "Unemployed — disability pending (back injury from prior job)",
    "Unemployed — recently released from prior incarceration",
    "Student — Atlanta Technical College (welding program)",
    "Student — Georgia State University (part-time)",
    "Self-employed — mobile car detailing business",
    "Employed — MARTA bus operator",
    "Employed part-time — Goodwill retail associate",
    "Unemployed — primary caregiver for elderly parent",
]

INCIDENT_NARRATIVES = [
    "On {date} at approximately {time}, officers responded to a {call_type} call at {location}. Upon arrival, {detail}. Defendant was {action}. {outcome}.",
    "Defendant was stopped by {officer} at {location} on {date} at {time} for {reason}. During the stop, {detail}. {outcome}.",
    "On {date}, {officer} responded to {location} following a 911 call reporting {call_type}. {detail}. Defendant {action}. {outcome}.",
    "According to the incident report dated {date}, defendant was involved in {call_type} at {location} at approximately {time}. {detail}. {action}. {outcome}.",
    "On {date} at {time}, a {call_type} was reported at {location}. When officers arrived, {detail}. Defendant was {action}. {outcome}.",
]

INCIDENT_CALL_TYPES = [
    "a domestic disturbance", "a robbery in progress", "a suspicious person",
    "a noise complaint", "an assault", "a shoplifting incident",
    "a vehicle break-in", "a drug transaction", "a DUI checkpoint stop",
    "a traffic accident", "a weapons complaint", "a trespassing complaint",
    "a burglary alarm", "an altercation between two parties",
]

INCIDENT_TIMES = [
    "10:15 PM", "2:30 AM", "11:45 PM", "3:15 AM", "8:30 PM",
    "12:45 AM", "9:20 PM", "1:10 AM", "7:30 PM", "4:45 AM",
    "6:15 PM", "11:00 PM", "2:00 PM", "10:30 AM", "5:45 PM",
]

INCIDENT_DETAILS = [
    "officers observed defendant standing outside the establishment arguing loudly with another individual",
    "the victim was found with visible injuries and identified defendant as the assailant",
    "defendant was found in possession of a clear plastic bag containing a white powdery substance",
    "defendant was seated in the driver's seat of a parked vehicle with the engine running and appeared intoxicated",
    "a quantity of suspected marijuana (approximately 2.3 grams) was found in defendant's jacket pocket during a pat-down",
    "defendant was observed placing unpaid merchandise into a backpack and exiting through the store entrance",
    "a handgun was recovered from the center console of defendant's vehicle during a consent search",
    "defendant's BAC was measured at 0.14 following a portable breath test at the scene",
    "the store manager identified defendant from surveillance footage as the individual who took items valued at $387",
    "defendant initially gave a false name to officers and was later identified through fingerprint comparison",
    "officers recovered 47 individually packaged bags of a substance that field-tested positive for crack cocaine",
    "the victim's vehicle was located in defendant's possession approximately 4 hours after the reported theft",
    "a K-9 unit alerted to the trunk of defendant's vehicle, where officers recovered a duffel bag containing 1.2 kg of methamphetamine",
    "defendant was found inside the residence with a broken rear window and was carrying a pillowcase containing jewelry and electronics",
    "the victim reported that defendant struck them in the face with a closed fist, resulting in a fractured orbital bone",
]

INCIDENT_ACTIONS = [
    "taken into custody without incident",
    "placed under arrest after Miranda warnings were administered",
    "initially uncooperative but complied after backup arrived",
    "apprehended after a brief foot pursuit through the parking lot",
    "found hiding in a nearby dumpster enclosure",
    "identified by the victim at the scene",
    "cooperative and provided a statement to detectives",
    "invoked right to counsel and declined to answer questions",
    "transported to Grady Memorial Hospital for treatment of minor injuries before booking",
    "taken into custody after a traffic stop approximately 2 miles from the scene",
]

INCIDENT_OUTCOMES = [
    "Defendant was transported to Fulton County Jail and booked without incident",
    "Evidence was collected and submitted to the GBI crime lab for analysis",
    "Defendant was released on bond the following day",
    "A search warrant was obtained for defendant's residence, yielding additional evidence",
    "The victim was transported to Grady Memorial with non-life-threatening injuries",
    "Defendant's vehicle was impounded and processed for evidence",
    "Defendant was held without bond pending initial appearance",
    "Defendant posted bond ($5,000 surety) approximately 48 hours after arrest",
    "All recovered property was returned to the victim",
    "Body-worn camera footage from the responding officers has been preserved",
]

VICTIM_INFO = [
    "Victim: {vname}, age {vage}, {vrelation}. {vstatus}.",
    "Alleged victim: {vname} ({vrelation}). {vstatus}.",
    "Complainant: {vname}, age {vage}. {vstatus}.",
]

VICTIM_NAMES = [
    "Maria Gonzalez", "David Thompson", "Lisa Washington", "Marcus Johnson",
    "Stephanie Brown", "Robert Miller", "Angela Davis", "James Wilson",
    "Patricia Harris", "Kenneth Moore", "Sandra Taylor", "Willie Jackson",
    "Dorothy White", "Charles Martin", "Betty Robinson", "Frank Anderson",
    "Brenda Thomas", "Raymond Lee", "Gloria Martinez", "Eugene Clark",
]

VICTIM_RELATIONS = [
    "girlfriend of defendant", "neighbor", "store owner", "ex-spouse of defendant",
    "co-worker", "stranger — no prior relationship", "roommate",
    "family member (cousin)", "current spouse of defendant",
    "business partner", "landlord", "acquaintance through mutual friends",
]

VICTIM_STATUSES = [
    "Victim was treated at Grady Memorial and released",
    "Victim sustained minor bruising, declined medical treatment",
    "Victim was hospitalized for 3 days with fractures",
    "Victim is cooperating with the prosecution",
    "Victim has expressed desire not to prosecute",
    "Victim has requested a temporary protective order",
    "Victim suffered property loss estimated at $2,400",
    "Victim suffered property loss estimated at $850",
    "Victim has not responded to DA's attempts to contact",
    "Victim has filed a civil lawsuit separately",
]

TIMELINE_EVENTS = [
    "Arrest: {arrest_date}",
    "Initial appearance: {init_date}",
    "Bond set at {bond} on {bond_date}",
    "Grand jury indictment returned {indict_date}",
    "Arraignment held {arraign_date} — plea of not guilty entered",
    "Discovery served on {disc_date}",
    "Preliminary hearing held {prelim_date}",
    "State filed notice of intent to seek enhanced sentencing on {notice_date}",
    "Defense filed motion to suppress on {motion_date}",
    "Status conference held {status_date} — trial date set",
]

CO_DEFENDANT_NAMES = [
    "Marcus Thompson", "Anthony Jackson", "Tyrone Davis", "Derrick Wilson",
    "Xavier Johnson", "Crystal Williams", "Latasha Brown", "Devon Harris",
    "Jasmine Moore", "Terrence Adams", "Keshia Robinson", "Darius Martin",
]

MITIGATING_FACTORS = [
    "Defendant has been consistently employed for the past 2 years.",
    "Defendant is the sole provider for 3 minor children (ages 2, 5, 8).",
    "Defendant completed a GED program while previously incarcerated.",
    "Defendant has strong family support — mother and sister attend every hearing.",
    "Defendant has been sober for 14 months and attends NA meetings weekly.",
    "Defendant was honorably discharged from the U.S. Army in 2019.",
    "Defendant is actively enrolled in vocational training (HVAC certification).",
    "Defendant has no history of violence — all prior offenses are property crimes.",
    "Defendant is the primary caregiver for a disabled family member.",
    "Defendant has been compliant with all pretrial conditions since release.",
    "Defendant is 19 years old with no prior record — youthful offender consideration may apply.",
    "Defendant has significant mental health history (bipolar disorder, PTSD) and is engaged in treatment.",
    "Defendant was a victim of domestic violence in a prior relationship.",
    "Defendant voluntarily entered a drug treatment program before arrest.",
    "Defendant's employer has agreed to hold their position during proceedings.",
]


# ---------------------------------------------------------------------------
# Key (hand-crafted) cases
# ---------------------------------------------------------------------------

def _build_key_cases() -> list[dict]:
    """Return the 15 hand-crafted key cases with specific cross-connections."""

    key_cases = []

    # -----------------------------------------------------------------------
    # GROUP 1 — Speedy Trial Risk
    # -----------------------------------------------------------------------
    key_cases.append({
        "case_number": "CR-2025-0047",
        "defendant_name": "Marcus Thompson",
        "charges": json.dumps(["Aggravated Assault"]),
        "severity": "felony",
        "status": "active",
        "court": "Fulton County Superior Court",
        "judge": "Hon. Robert Franklin",
        "prosecutor": "ADA Karen Mitchell",
        "next_hearing_date": None,
        "hearing_type": None,
        "filing_date": "2025-09-20",
        "arrest_date": "2025-09-17",
        "evidence_summary": (
            "Victim statement alleges defendant struck him with a beer bottle "
            "during an altercation at a bar on Edgewood Ave. Security camera "
            "footage from the bar has been requested but not yet received by "
            "the defense. Medical records from Grady Memorial show the victim "
            "sustained a broken jaw requiring surgical repair. Victim recanted "
            "his identification of the defendant once during a follow-up "
            "interview with detectives, then reaffirmed it the following day."
        ),
        "notes": (
            "Client appeared for arraignment and entered not guilty plea. "
            "Client is out on $15,000 surety bond and is compliant with all "
            "conditions. No hearing has been scheduled since the arraignment "
            "on October 3, 2025. Discovery was received on October 15, 2025."
        ),
        "attorney_notes": (
            "Client maintains he acted in self-defense after the victim "
            "threatened him with a knife. Need to subpoena the bar's security "
            "camera footage — the State has not produced it in discovery. "
            "Possible Stand Your Ground defense under O.C.G.A. 16-3-23.1. "
            "Victim's recantation is significant and should be explored. "
            "Need to identify and interview other bar patrons who witnessed "
            "the altercation."
        ),
        "plea_offer": None,
        "plea_offer_details": None,
        "disposition": None,
        "arresting_officer": "Officer T. Bradley",
        "precinct": "Precinct 7",
        "witnesses": json.dumps(["Carlos Mendez (bartender)", "Unnamed bar patron"]),
        "prior_record": (
            "One prior misdemeanor conviction for simple battery (2023). "
            "Sentenced to 12 months probation, successfully completed."
        ),
        "bond_status": "$15,000 surety bond",
        "created_at": "2025-09-20T00:00:00",
        "updated_at": "2026-02-10T00:00:00",
    })

    # -----------------------------------------------------------------------
    # GROUP 2 — Same Officer, Contested Searches (Officer J. Rodriguez)
    # -----------------------------------------------------------------------
    key_cases.append({
        "case_number": "CR-2025-0012",
        "defendant_name": "DeShawn Williams",
        "charges": json.dumps(["Possession with Intent to Distribute"]),
        "severity": "felony",
        "status": "active",
        "court": "Fulton County Superior Court",
        "judge": "Hon. Carolyn Hughes",
        "prosecutor": "ADA Brian Foster",
        "next_hearing_date": "2026-02-24",
        "hearing_type": "Motions Hearing",
        "filing_date": "2025-06-15",
        "arrest_date": "2025-06-12",
        "evidence_summary": (
            "On June 12, 2025, Officer J. Rodriguez conducted a traffic stop "
            "on defendant's vehicle for an alleged lane change violation. "
            "Officer Rodriguez states he detected the plain smell of marijuana "
            "emanating from the vehicle, which he used as justification to "
            "search the car. During the search of the center console, 2.3 "
            "grams of cocaine in individual baggies were recovered. No "
            "marijuana was found anywhere in the vehicle. Defendant was "
            "arrested and charged. Field test returned presumptive positive "
            "for cocaine. Lab confirmation pending."
        ),
        "notes": (
            "Client maintains he was unaware of any cocaine in the vehicle. "
            "Vehicle is registered to client's girlfriend. Discovery received "
            "in full. Motions hearing scheduled for February 24 to argue "
            "suppression of evidence from the search."
        ),
        "attorney_notes": (
            "Significant Fourth Amendment issues with this search. Officer "
            "Rodriguez claimed the odor of marijuana justified a warrantless "
            "search, but no marijuana was found in the vehicle — undermining "
            "the stated probable cause. Need to obtain Rodriguez's dashcam "
            "and body cam footage. Filing motion to suppress all evidence "
            "obtained from the search. Also requesting Rodriguez's stop "
            "history — suspect a pattern of pretextual stops."
        ),
        "plea_offer": "3 years to serve, 7 years probation",
        "plea_offer_details": (
            "State offered 3 years to serve with 7 years probation in "
            "exchange for guilty plea to possession with intent. Offer "
            "contingent on forfeiture of vehicle. Offer expires March 1, "
            "2026. Client has rejected this offer pending outcome of "
            "suppression motion."
        ),
        "disposition": None,
        "arresting_officer": "Officer J. Rodriguez",
        "precinct": "Precinct 14",
        "witnesses": json.dumps(["Officer J. Rodriguez"]),
        "prior_record": (
            "One prior misdemeanor marijuana possession charge (2022), "
            "resolved through pretrial diversion. No felony record."
        ),
        "bond_status": "$25,000 surety bond",
        "created_at": "2025-06-15T00:00:00",
        "updated_at": "2026-02-10T00:00:00",
    })

    key_cases.append({
        "case_number": "CR-2025-0089",
        "defendant_name": "Antonio Reeves",
        "charges": json.dumps(["Felony Drug Possession", "Possession of Drug Related Objects"]),
        "severity": "felony",
        "status": "active",
        "court": "Fulton County Superior Court",
        "judge": "Hon. Marcus Washington",
        "prosecutor": "ADA Natalie Park",
        "next_hearing_date": "2026-03-05",
        "hearing_type": "Motions Hearing",
        "filing_date": "2025-08-22",
        "arrest_date": "2025-08-19",
        "evidence_summary": (
            "On August 19, 2025, Officer J. Rodriguez initiated a traffic "
            "stop on defendant's vehicle for a broken taillight on Fulton "
            "Industrial Blvd. Officer Rodriguez states that the defendant "
            "gave verbal consent to a search of the vehicle. During the "
            "search, 4.7 grams of methamphetamine and a digital scale were "
            "found in a backpack on the rear seat. Defendant was arrested on "
            "scene. Defendant adamantly denies giving consent to the search. "
            "Body camera footage from Officer Rodriguez is listed as "
            "'unavailable due to equipment malfunction' per the department's "
            "records custodian."
        ),
        "notes": (
            "Client insists he never consented to the search. Body camera "
            "footage that would resolve the consent question is conveniently "
            "unavailable. Filed preservation request for all digital evidence "
            "on August 25, 2025. Motions hearing set for March 5 to address "
            "suppression and Brady issues."
        ),
        "attorney_notes": (
            "Body cam footage is conveniently missing — this is the second "
            "Rodriguez case in our caseload with search issues. Need to file "
            "a comprehensive Brady motion demanding all body cam records for "
            "Officer Rodriguez for the past 12 months. Also need to request "
            "Rodriguez's personnel file and any citizen complaints. The "
            "consent claim is unsupported without the body cam. Defendant is "
            "credible and consistent in denying consent. Filing motion to "
            "suppress all evidence from the search."
        ),
        "plea_offer": "2 years to serve, 3 years probation",
        "plea_offer_details": (
            "State offered 2 years to serve with 3 years probation and "
            "mandatory drug treatment. Offer requires guilty plea to felony "
            "drug possession — drug-related objects charge would be dropped. "
            "Client is considering but wants to wait for suppression ruling."
        ),
        "disposition": None,
        "arresting_officer": "Officer J. Rodriguez",
        "precinct": "Precinct 14",
        "witnesses": json.dumps(["Officer J. Rodriguez"]),
        "prior_record": (
            "Two prior misdemeanor convictions: simple possession of marijuana "
            "(2021) and disorderly conduct (2023). No felony record. "
            "Completed probation on both."
        ),
        "bond_status": "$10,000 surety bond",
        "created_at": "2025-08-22T00:00:00",
        "updated_at": "2026-02-10T00:00:00",
    })

    key_cases.append({
        "case_number": "CR-2025-0142",
        "defendant_name": "Keisha Johnson",
        "charges": json.dumps(["Possession of Controlled Substance"]),
        "severity": "misdemeanor",
        "status": "active",
        "court": "Atlanta Municipal Court",
        "judge": "Hon. Elena Rodriguez",
        "prosecutor": "ADA Derek Robinson",
        "next_hearing_date": "2026-02-18",
        "hearing_type": "Status Conference",
        "filing_date": "2025-10-10",
        "arrest_date": "2025-10-07",
        "evidence_summary": (
            "On October 7, 2025, Officer J. Rodriguez stopped defendant's "
            "vehicle for an expired registration tag. After running "
            "defendant's information, Rodriguez placed her under arrest for "
            "the expired registration. During an 'inventory search' of "
            "defendant's purse incident to the arrest, Rodriguez recovered a "
            "prescription pill bottle containing 8 Xanax pills that did not "
            "match the prescription label name. Defendant states the pills "
            "belong to her mother, who has a valid prescription, and that she "
            "was picking them up from the pharmacy on her mother's behalf."
        ),
        "notes": (
            "Client is a 34-year-old single mother with no prior criminal "
            "record. She works as a home health aide. The arrest for expired "
            "registration appears to be pretextual — typically a citation "
            "offense, not an arrestable one. Status conference set for "
            "February 18, 2026."
        ),
        "attorney_notes": (
            "The arrest for expired registration seems highly pretextual — "
            "Georgia law treats this as a citation offense, and a custodial "
            "arrest is unusual. The subsequent search incident to arrest for "
            "a traffic violation is constitutionally questionable under "
            "Arizona v. Gant. This is the third case in our office involving "
            "Officer Rodriguez and a contested vehicle search. Need to "
            "coordinate with co-counsel handling the Williams and Reeves "
            "cases to build a pattern-of-conduct argument. Filing motion to "
            "suppress and considering requesting Rodriguez's full stop and "
            "search history from the department."
        ),
        "plea_offer": "Conditional discharge with treatment program",
        "plea_offer_details": (
            "State offered conditional discharge with drug education program. "
            "Charge would be dismissed upon completion. Reasonable offer but "
            "client maintains her innocence and wants to fight the charge."
        ),
        "disposition": None,
        "arresting_officer": "Officer J. Rodriguez",
        "precinct": "Precinct 14",
        "witnesses": json.dumps(["Officer J. Rodriguez", "Defendant's mother (Gloria Johnson)"]),
        "prior_record": "No prior criminal record. First-time offender.",
        "bond_status": "ROR",
        "created_at": "2025-10-10T00:00:00",
        "updated_at": "2026-02-10T00:00:00",
    })

    # -----------------------------------------------------------------------
    # GROUP 3 — Plea Offer Pattern (Similar Assault Cases)
    # -----------------------------------------------------------------------
    key_cases.append({
        "case_number": "CR-2025-0023",
        "defendant_name": "Robert Chen",
        "charges": json.dumps(["Aggravated Assault"]),
        "severity": "felony",
        "status": "plea_pending",
        "court": "Fulton County Superior Court",
        "judge": "Hon. Patricia Williams",
        "prosecutor": "ADA Stephanie Weiss",
        "next_hearing_date": "2026-02-20",
        "hearing_type": "Status Conference",
        "filing_date": "2025-07-10",
        "arrest_date": "2025-07-08",
        "evidence_summary": (
            "Bar fight at a sports bar on Peachtree St on July 8, 2025. "
            "Defendant and victim, a stranger, got into a verbal argument "
            "over a seat at the bar that escalated to physical blows. "
            "Defendant struck the victim in the face, causing a fractured "
            "orbital bone. Surveillance footage from the bar shows the victim "
            "initiated the verbal confrontation, but defendant threw the "
            "first punch. Two bar patrons provided witness statements "
            "corroborating the footage. Victim's medical records document the "
            "orbital fracture and required outpatient surgery."
        ),
        "notes": (
            "Client is a 28-year-old software engineer with no prior record. "
            "He is remorseful and has expressed willingness to pay restitution. "
            "Plea offer received from the State — currently under consideration. "
            "Client has stable employment and strong community ties."
        ),
        "attorney_notes": (
            "Surveillance footage is a mixed bag — it shows victim was the "
            "verbal aggressor but client threw the first punch. Self-defense "
            "argument is weak given that client escalated to physical violence. "
            "The plea offer of 2 years probation is reasonable given the "
            "circumstances and client's clean record. Recommending client "
            "accept. Comparable cases with similar facts have resulted in "
            "similar outcomes."
        ),
        "plea_offer": "2 years probation",
        "plea_offer_details": (
            "State offered 2 years probation with anger management classes "
            "and restitution to the victim for medical expenses. Guilty plea "
            "to aggravated assault. No jail time. Offer expires February 28, "
            "2026."
        ),
        "disposition": None,
        "arresting_officer": "Officer M. Nguyen",
        "precinct": "Precinct 7",
        "witnesses": json.dumps(["David Lawson (bar patron)", "Emily Torres (bar patron)"]),
        "prior_record": "No prior criminal record. First-time offender.",
        "bond_status": "$10,000 surety bond",
        "created_at": "2025-07-10T00:00:00",
        "updated_at": "2026-02-10T00:00:00",
    })

    key_cases.append({
        "case_number": "CR-2025-0056",
        "defendant_name": "James Mitchell",
        "charges": json.dumps(["Aggravated Assault"]),
        "severity": "felony",
        "status": "plea_pending",
        "court": "Fulton County Superior Court",
        "judge": "Hon. David Kim",
        "prosecutor": "ADA Marcus Grant",
        "next_hearing_date": "2026-02-27",
        "hearing_type": "Status Conference",
        "filing_date": "2025-08-05",
        "arrest_date": "2025-08-02",
        "evidence_summary": (
            "Bar fight at a restaurant-bar on Ponce de Leon Ave on August 2, "
            "2025. Defendant and the victim, a stranger, were involved in a "
            "dispute over a spilled drink. The argument escalated and "
            "defendant struck the victim multiple times, causing a broken "
            "nose and lacerations requiring 12 stitches. Surveillance footage "
            "from the establishment shows both parties exchanging words before "
            "defendant threw the first punch. One bartender and one patron "
            "provided statements. Victim was treated at Piedmont Hospital."
        ),
        "notes": (
            "Client is a 31-year-old construction worker. He has one prior "
            "misdemeanor for disorderly conduct from 2022. Plea offer "
            "received — client feels the offer is too harsh. Hearing set for "
            "February 27, 2026."
        ),
        "attorney_notes": (
            "The facts here are strikingly similar to the Robert Chen case "
            "(CR-2025-0023) — both are bar fights with strangers, both "
            "defendants threw the first punch, both resulted in facial "
            "injuries requiring medical treatment. However, the plea offer "
            "in this case is dramatically harsher: 5 years serve 2, versus "
            "2 years probation for Chen. The main differences are the judge "
            "(Kim vs. Williams) and the prosecutor (Grant vs. Weiss). "
            "Client's single prior misdemeanor does not justify this "
            "disparity. Consider filing a motion referencing comparable "
            "dispositions. Need to push back hard on this offer."
        ),
        "plea_offer": "5 years, serve 2",
        "plea_offer_details": (
            "State offered 5 years with 2 to serve in state custody and "
            "balance on probation. Guilty plea to aggravated assault. "
            "Restitution required. This offer is significantly more severe "
            "than comparable cases currently on our docket. Offer expires "
            "March 15, 2026."
        ),
        "disposition": None,
        "arresting_officer": "Officer K. O'Brien",
        "precinct": "Precinct 3",
        "witnesses": json.dumps(["Mike Reynolds (bartender)", "Amanda Clarke (patron)"]),
        "prior_record": (
            "One prior misdemeanor conviction for disorderly conduct (2022). "
            "Paid a fine, no probation. No other criminal history."
        ),
        "bond_status": "$15,000 surety bond",
        "created_at": "2025-08-05T00:00:00",
        "updated_at": "2026-02-10T00:00:00",
    })

    key_cases.append({
        "case_number": "CR-2025-0078",
        "defendant_name": "Maria Santos",
        "charges": json.dumps(["Aggravated Assault"]),
        "severity": "felony",
        "status": "plea_pending",
        "court": "Fulton County Superior Court",
        "judge": "Hon. Patricia Williams",
        "prosecutor": "ADA Lisa Chung",
        "next_hearing_date": "2026-03-03",
        "hearing_type": "Status Conference",
        "filing_date": "2025-08-18",
        "arrest_date": "2025-08-15",
        "evidence_summary": (
            "On August 15, 2025, defendant and the victim, an acquaintance, "
            "were involved in a heated argument at defendant's apartment on "
            "Cascade Rd that turned physical. Defendant struck the victim "
            "with a ceramic vase, causing a deep laceration on the forehead "
            "requiring 8 stitches and a mild concussion. The victim called "
            "911. Responding officers photographed the scene and collected "
            "the broken vase. Victim provided a written statement. Defendant "
            "told officers the victim had been threatening her and she acted "
            "in self-defense."
        ),
        "notes": (
            "Client is a 26-year-old restaurant worker. She states the victim "
            "had been harassing and threatening her for weeks prior to the "
            "incident. Plea offer received. Client is considering it but "
            "prefers to pursue self-defense argument."
        ),
        "attorney_notes": (
            "Self-defense argument has some merit here — client can show a "
            "pattern of threatening behavior from the victim via text "
            "messages. The plea offer of 3 years probation from Judge "
            "Williams is in line with what we saw offered in the Chen case "
            "(also Judge Williams). This is a more favorable outcome than "
            "what Mitchell was offered by Judge Kim for arguably worse facts. "
            "Recommending client consider accepting if self-defense "
            "motion is denied."
        ),
        "plea_offer": "3 years probation",
        "plea_offer_details": (
            "State offered 3 years probation with anger management program "
            "and no-contact order with the victim. Guilty plea to aggravated "
            "assault. No jail time. Offer is reasonable and consistent with "
            "similar dispositions before Judge Williams."
        ),
        "disposition": None,
        "arresting_officer": "Officer D. Washington",
        "precinct": "District 2",
        "witnesses": json.dumps(["Victim (Teresa Vega)", "Responding Officer D. Washington"]),
        "prior_record": "No prior criminal record.",
        "bond_status": "$7,500 surety bond",
        "created_at": "2025-08-18T00:00:00",
        "updated_at": "2026-02-10T00:00:00",
    })

    # -----------------------------------------------------------------------
    # GROUP 4 — Shared Witness / Impeachment
    # -----------------------------------------------------------------------
    key_cases.append({
        "case_number": "CR-2025-0101",
        "defendant_name": "Tyrone Washington",
        "charges": json.dumps(["Armed Robbery"]),
        "severity": "felony",
        "status": "active",
        "court": "Fulton County Superior Court",
        "judge": "Hon. Thomas Whitfield",
        "prosecutor": "ADA Robert Hayes",
        "next_hearing_date": "2026-03-10",
        "hearing_type": "Preliminary Hearing",
        "filing_date": "2025-09-05",
        "arrest_date": "2025-09-02",
        "evidence_summary": (
            "Defendant is charged with armed robbery of a convenience store "
            "on Memorial Dr on September 2, 2025. The prosecution's key "
            "witness, James Patterson, was in the store at the time and "
            "identified the defendant from a photo lineup conducted three "
            "days after the incident. Patterson stated the robber was "
            "approximately 6 feet tall, wore a dark hoodie, and brandished "
            "what appeared to be a handgun. Surveillance footage from the "
            "store is grainy and does not clearly show the robber's face. "
            "No weapon has been recovered. No fingerprints or DNA evidence "
            "link defendant to the scene. The identification relies entirely "
            "on Patterson's testimony."
        ),
        "notes": (
            "Client denies involvement and states he was at home at the time "
            "of the robbery. His girlfriend is willing to testify as an alibi "
            "witness but her credibility may be questioned. The case hinges "
            "on the eyewitness identification by James Patterson. Preliminary "
            "hearing set for March 10, 2026."
        ),
        "attorney_notes": (
            "The state's case is almost entirely dependent on the eyewitness "
            "identification by James Patterson. The surveillance footage is "
            "too poor quality to confirm or deny the ID. No physical evidence "
            "ties our client to the crime. The photo lineup procedure should "
            "be scrutinized — need to obtain the full lineup packet and "
            "determine if the procedure was suggestive. Patterson's "
            "credibility as a witness is crucial. Need to thoroughly "
            "investigate Patterson's background, any prior relationship with "
            "defendant, and any incentives he may have to cooperate with "
            "the prosecution."
        ),
        "plea_offer": None,
        "plea_offer_details": None,
        "disposition": None,
        "arresting_officer": "Det. Sarah Chen",
        "precinct": "Precinct 11",
        "witnesses": json.dumps(["James Patterson (eyewitness)", "Store clerk (name withheld)"]),
        "prior_record": (
            "One prior misdemeanor conviction for simple assault (2023). "
            "Completed probation. No felony record."
        ),
        "bond_status": "$50,000 surety bond",
        "created_at": "2025-09-05T00:00:00",
        "updated_at": "2026-02-10T00:00:00",
    })

    key_cases.append({
        "case_number": "CR-2025-0033",
        "defendant_name": "James Patterson",
        "charges": json.dumps(["Misdemeanor Theft", "Giving False Information to Police"]),
        "severity": "misdemeanor",
        "status": "active",
        "court": "Atlanta Municipal Court",
        "judge": "Hon. Sandra Mitchell",
        "prosecutor": "ADA Derek Robinson",
        "next_hearing_date": "2026-02-19",
        "hearing_type": "Status Conference",
        "filing_date": "2025-07-22",
        "arrest_date": "2025-07-20",
        "evidence_summary": (
            "On July 20, 2025, defendant was observed by store security at a "
            "retail store on Camp Creek Pkwy concealing merchandise valued at "
            "$380 in a bag. When confronted by security, defendant provided a "
            "false name and date of birth. Police were called and defendant "
            "was positively identified through his driver's license photo. "
            "Store surveillance footage clearly shows defendant concealing "
            "the merchandise. Defendant was cooperative after being properly "
            "identified."
        ),
        "notes": (
            "Defendant has a pending theft charge. He is known to be "
            "cooperating with the prosecution on unrelated matters. "
            "Defendant's case has been continued multiple times at the "
            "State's request. Status conference set for February 19, 2026."
        ),
        "attorney_notes": (
            "Client's case keeps getting continued — suspicious that the "
            "State may be keeping this case open as leverage for his "
            "cooperation as a witness in other matters. Need to determine "
            "the full extent of any cooperation agreements Patterson has "
            "with the DA's office. His credibility is compromised by the "
            "false information charge and any undisclosed deals could be "
            "impeachment gold in any case where he testifies."
        ),
        "plea_offer": "Diversion program",
        "plea_offer_details": (
            "State offered pretrial diversion program with community service. "
            "Charges would be dismissed upon completion. Offer seems unusually "
            "generous given the false information charge — raises questions "
            "about whether this is tied to Patterson's cooperation in other "
            "cases."
        ),
        "disposition": None,
        "arresting_officer": "Officer S. Patel",
        "precinct": "District 5",
        "witnesses": json.dumps(["Store security officer (Mark Davis)", "Officer S. Patel"]),
        "prior_record": (
            "Two prior arrests: shoplifting (2022, dismissed) and disorderly "
            "conduct (2023, pled nolo, community service). No felony record."
        ),
        "bond_status": "ROR",
        "created_at": "2025-07-22T00:00:00",
        "updated_at": "2026-02-10T00:00:00",
    })

    # -----------------------------------------------------------------------
    # GROUP 5 — Same Officer with IAB Complaint (Det. Michael Harris)
    # -----------------------------------------------------------------------
    key_cases.append({
        "case_number": "CR-2025-0015",
        "defendant_name": "David Brown",
        "charges": json.dumps(["Obstruction of a Law Enforcement Officer", "Resisting Arrest"]),
        "severity": "misdemeanor",
        "status": "active",
        "court": "Fulton County Magistrate Court",
        "judge": "Hon. Diane Patel",
        "prosecutor": "ADA Karen Mitchell",
        "next_hearing_date": "2026-02-21",
        "hearing_type": "Motions Hearing",
        "filing_date": "2025-06-05",
        "arrest_date": "2025-06-02",
        "evidence_summary": (
            "On June 2, 2025, Det. Michael Harris responded to a noise "
            "complaint at defendant's residence on MLK Jr Blvd. According to "
            "Harris's report, the defendant became verbally abusive and "
            "refused to provide identification. When Harris attempted to "
            "detain the defendant, Harris states the defendant swung at him "
            "with a closed fist. Defendant was taken to the ground and "
            "handcuffed. No body camera footage is available — Harris states "
            "his camera was not activated. No independent witnesses were "
            "present. Defendant sustained abrasions on his face and arms "
            "during the arrest."
        ),
        "notes": (
            "Client states he was calm and cooperative and that Harris "
            "became aggressive without provocation. Client did not swing at "
            "the officer. Det. Harris has a pending Internal Affairs Bureau "
            "complaint for excessive force stemming from a separate July "
            "2025 incident. Motions hearing set for February 21, 2026."
        ),
        "attorney_notes": (
            "No body cam, no independent witnesses — this is purely Harris's "
            "word against our client's. The IAB complaint against Harris for "
            "excessive force in a July 2025 incident is highly relevant. "
            "Need to file Brady/Giglio motion for Harris's complete personnel "
            "file, IAB complaints, and any prior excessive force allegations. "
            "Also need to obtain dispatch records to verify the timeline "
            "Harris described. Client's injuries (facial abrasions, arm "
            "bruising) seem disproportionate to the described resistance."
        ),
        "plea_offer": "Time served",
        "plea_offer_details": (
            "State offered time served (defendant spent 2 days in custody "
            "before posting bond) with 6 months probation. Client wants to "
            "fight the charges given the circumstances of the arrest."
        ),
        "disposition": None,
        "arresting_officer": "Det. Michael Harris",
        "precinct": "Precinct 11",
        "witnesses": json.dumps(["Det. Michael Harris"]),
        "prior_record": (
            "No prior criminal record. Client is a 45-year-old postal "
            "worker with 20 years of employment."
        ),
        "bond_status": "$2,500 surety bond",
        "created_at": "2025-06-05T00:00:00",
        "updated_at": "2026-02-10T00:00:00",
    })

    key_cases.append({
        "case_number": "CR-2025-0067",
        "defendant_name": "Sarah Kim",
        "charges": json.dumps(["Assault on a Law Enforcement Officer", "Disorderly Conduct"]),
        "severity": "felony",
        "status": "active",
        "court": "Fulton County Superior Court",
        "judge": "Hon. Richard Okonkwo",
        "prosecutor": "ADA Brian Foster",
        "next_hearing_date": "2026-02-28",
        "hearing_type": "Preliminary Hearing",
        "filing_date": "2025-08-12",
        "arrest_date": "2025-08-10",
        "evidence_summary": (
            "On August 10, 2025, Det. Michael Harris responded to a "
            "disturbance call at a bar on Edgewood Ave. Harris states that "
            "upon arrival, the defendant was involved in a verbal altercation "
            "with another patron. When Harris intervened, he states the "
            "defendant kicked him in the shin. Defendant states that Harris "
            "grabbed her arm aggressively without identifying himself and she "
            "reacted instinctively. Emergency room records from Grady Memorial "
            "show the defendant presented with bruising on her upper arms and "
            "wrists inconsistent with the level of force Harris described "
            "using. Harris's body cam was again 'not activated' during the "
            "encounter."
        ),
        "notes": (
            "Client is a 29-year-old graduate student at Georgia State with "
            "no prior record. She states Harris was excessively aggressive "
            "during the encounter. Her injuries suggest force beyond what "
            "was necessary. Preliminary hearing set for February 28, 2026."
        ),
        "attorney_notes": (
            "This is the second case on our docket involving Det. Harris "
            "where body cam is 'not activated' and the defendant alleges "
            "excessive force — see also CR-2025-0015 (Brown). Harris's "
            "pending IAB complaint creates a clear Brady/Giglio obligation "
            "for the State. The ER records documenting bruising inconsistent "
            "with Harris's account are powerful evidence. Need to coordinate "
            "defense strategy with the Brown case. Filing comprehensive "
            "Brady motion for Harris's complete disciplinary history, all "
            "IAB complaints, all use-of-force reports, and body cam "
            "activation records."
        ),
        "plea_offer": None,
        "plea_offer_details": None,
        "disposition": None,
        "arresting_officer": "Det. Michael Harris",
        "precinct": "Precinct 11",
        "witnesses": json.dumps(["Det. Michael Harris", "Bar patron (unidentified)"]),
        "prior_record": "No prior criminal record.",
        "bond_status": "$10,000 surety bond",
        "created_at": "2025-08-12T00:00:00",
        "updated_at": "2026-02-10T00:00:00",
    })

    # -----------------------------------------------------------------------
    # GROUP 6 — Discovery Deadline
    # -----------------------------------------------------------------------
    key_cases.append({
        "case_number": "CR-2025-0134",
        "defendant_name": "Omar Hassan",
        "charges": json.dumps(["Burglary - First Degree", "Criminal Trespass"]),
        "severity": "felony",
        "status": "active",
        "court": "Fulton County Superior Court",
        "judge": "Hon. Carolyn Hughes",
        "prosecutor": "ADA Stephanie Weiss",
        "next_hearing_date": "2026-02-25",
        "hearing_type": "Status Conference",
        "filing_date": "2025-11-15",
        "arrest_date": "2025-11-12",
        "evidence_summary": (
            "On November 12, 2025, defendant was arrested at a commercial "
            "property on Buford Hwy after a silent alarm was triggered. "
            "Responding officers found defendant inside the building. "
            "Defendant states he entered the unlocked building seeking "
            "shelter from the rain and had no intent to commit a crime. "
            "Fingerprints were recovered from a cash register area. The "
            "building's security system recorded an entry at 2:47 AM. "
            "Property owner reports nothing was stolen but a window was "
            "found broken."
        ),
        "notes": (
            "Discovery request was filed on November 20, 2025, within the "
            "required 10-day window. As of February 10, 2026, the State has "
            "not responded to the discovery request. The 90-day discovery "
            "deadline is approaching rapidly. State's failure to produce "
            "discovery is severely prejudicing the defense's ability to "
            "prepare for this case. Status conference on February 25 should "
            "address this."
        ),
        "attorney_notes": (
            "Critical issue: discovery request was filed November 20, 2025, "
            "and the State has provided NOTHING — no police reports, no "
            "fingerprint analysis, no security footage, no witness statements. "
            "We are approaching 90 days without a response. Need to file an "
            "emergency motion to compel discovery and request sanctions. If "
            "the State cannot produce discovery, we should move for dismissal. "
            "The client's account of seeking shelter is plausible — the "
            "burglary charge requires proof of intent to commit a felony "
            "inside, which may be difficult for the State to establish."
        ),
        "plea_offer": None,
        "plea_offer_details": None,
        "disposition": None,
        "arresting_officer": "Officer R. Simmons",
        "precinct": "District 5",
        "witnesses": json.dumps(["Property owner (David Nakamura)", "Officer R. Simmons"]),
        "prior_record": (
            "One prior misdemeanor trespassing charge (2024), resolved with "
            "time served. Client is currently homeless and has been connected "
            "with social services."
        ),
        "bond_status": "ROR",
        "created_at": "2025-11-15T00:00:00",
        "updated_at": "2026-02-10T00:00:00",
    })

    # -----------------------------------------------------------------------
    # Additional key cases to reach 15 total
    # -----------------------------------------------------------------------

    # Another Officer Rodriguez case — closed/dismissed, establishes pattern
    key_cases.append({
        "case_number": "CR-2025-0155",
        "defendant_name": "Terrence Walker",
        "charges": json.dumps(["Marijuana Possession (less than 1 oz)"]),
        "severity": "misdemeanor",
        "status": "closed",
        "court": "Atlanta Municipal Court",
        "judge": "Hon. Elena Rodriguez",
        "prosecutor": "ADA Derek Robinson",
        "next_hearing_date": None,
        "hearing_type": None,
        "filing_date": "2025-04-10",
        "arrest_date": "2025-04-08",
        "evidence_summary": (
            "On April 8, 2025, Officer J. Rodriguez conducted a traffic stop "
            "for an alleged failure to signal. Rodriguez claimed to smell "
            "marijuana and searched the vehicle. A small amount of marijuana "
            "(less than 1 gram) was found under the passenger seat. "
            "Defendant was the sole occupant. Defendant's motion to suppress "
            "was granted after the court found the traffic stop lacked "
            "reasonable suspicion — dashcam footage showed defendant did in "
            "fact use a turn signal."
        ),
        "notes": (
            "Case dismissed on August 22, 2025, after successful motion to "
            "suppress. Judge Rodriguez found that Officer Rodriguez's stated "
            "basis for the stop was contradicted by his own dashcam footage. "
            "This is a significant precedent for other Rodriguez stop cases."
        ),
        "attorney_notes": (
            "Motion to suppress was granted — dashcam clearly showed "
            "defendant used his turn signal, directly contradicting "
            "Rodriguez's stated reason for the stop. This outcome should be "
            "cited in the Williams (CR-2025-0012), Reeves (CR-2025-0089), "
            "and Johnson (CR-2025-0142) cases to establish Rodriguez's "
            "pattern of fabricating reasons for traffic stops. The court's "
            "finding that Rodriguez was not credible regarding the stop is "
            "powerful impeachment material."
        ),
        "plea_offer": None,
        "plea_offer_details": None,
        "disposition": "Dismissed — motion to suppress granted",
        "arresting_officer": "Officer J. Rodriguez",
        "precinct": "Precinct 14",
        "witnesses": json.dumps(["Officer J. Rodriguez"]),
        "prior_record": "No prior criminal record.",
        "bond_status": "",
        "created_at": "2025-04-10T00:00:00",
        "updated_at": "2025-08-22T00:00:00",
    })

    # Speedy trial companion — another case approaching the deadline
    key_cases.append({
        "case_number": "CR-2025-0163",
        "defendant_name": "Andre Clark",
        "charges": json.dumps(["Theft by Taking (Felony)", "Entering Automobile"]),
        "severity": "felony",
        "status": "active",
        "court": "DeKalb County State Court",
        "judge": "Hon. Thomas Whitfield",
        "prosecutor": "ADA Natalie Park",
        "next_hearing_date": None,
        "hearing_type": None,
        "filing_date": "2025-09-08",
        "arrest_date": "2025-09-05",
        "evidence_summary": (
            "Defendant was arrested on September 5, 2025, after being found "
            "in possession of a laptop, GPS unit, and personal items "
            "matching those reported stolen from a vehicle in a parking "
            "garage on Peachtree St. The vehicle owner identified the items. "
            "Surveillance footage from the garage shows a figure matching "
            "defendant's description near the vehicle but the footage is low "
            "resolution. No fingerprints were recovered from the vehicle."
        ),
        "notes": (
            "Client states he purchased the items from an unknown individual "
            "on the street and did not know they were stolen. No hearing has "
            "been scheduled since the initial arraignment on September 15, "
            "2025. Discovery was received in October 2025. Case appears to "
            "be stalled on the State's side."
        ),
        "attorney_notes": (
            "Another case with no hearing scheduled for months — similar to "
            "the Thompson case (CR-2025-0047). Filing date of September 8, "
            "2025 means the 180-day speedy trial window is closing around "
            "March 7, 2026. Need to calendar this deadline immediately. "
            "The State's evidence is circumstantial — no direct evidence "
            "places defendant inside the vehicle. The identification from "
            "surveillance is weak. Consider filing speedy trial demand to "
            "force the State's hand."
        ),
        "plea_offer": "18 months probation",
        "plea_offer_details": (
            "State offered 18 months probation with restitution to the "
            "vehicle owner. Plea to theft by taking, entering automobile "
            "charge dropped. Client wants to wait given the weak evidence."
        ),
        "disposition": None,
        "arresting_officer": "Officer L. Freeman",
        "precinct": "District 2",
        "witnesses": json.dumps(["Vehicle owner (Patricia Gomez)", "Garage security guard"]),
        "prior_record": (
            "One prior misdemeanor theft conviction (2023). Sentenced to "
            "12 months probation, completed successfully."
        ),
        "bond_status": "$5,000 surety bond",
        "created_at": "2025-09-08T00:00:00",
        "updated_at": "2026-02-10T00:00:00",
    })

    # Det. Harris third case — strengthens the pattern
    key_cases.append({
        "case_number": "CR-2025-0118",
        "defendant_name": "Jerome Adams",
        "charges": json.dumps(["Obstruction of a Law Enforcement Officer"]),
        "severity": "misdemeanor",
        "status": "closed",
        "court": "Fulton County Magistrate Court",
        "judge": "Hon. Diane Patel",
        "prosecutor": "ADA Karen Mitchell",
        "next_hearing_date": None,
        "hearing_type": None,
        "filing_date": "2025-07-18",
        "arrest_date": "2025-07-15",
        "evidence_summary": (
            "On July 15, 2025, Det. Michael Harris arrested defendant during "
            "a street encounter in the Bankhead neighborhood. Harris states "
            "defendant refused to comply with a lawful order to stop and "
            "identify himself. Defendant states he was simply walking home "
            "from a corner store and Harris stopped him without cause. A "
            "bystander who recorded part of the encounter on cell phone "
            "provided footage showing Harris grabbing defendant's arm before "
            "identifying himself as law enforcement. Charges were ultimately "
            "dropped by the State."
        ),
        "notes": (
            "Charges were nolle prossed on October 1, 2025, after bystander "
            "video contradicted Harris's account. This is the incident "
            "referenced in Harris's pending IAB complaint. The bystander "
            "video was key to the dismissal."
        ),
        "attorney_notes": (
            "This is the July 2025 incident that generated the IAB complaint "
            "against Det. Harris. The bystander video clearly shows Harris "
            "initiating physical contact with our client before identifying "
            "himself. This case — and especially the bystander video — is "
            "critical impeachment material for the Brown (CR-2025-0015) and "
            "Kim (CR-2025-0067) cases. The video directly undermines Harris's "
            "credibility regarding use of force. Need to ensure this video "
            "is preserved and available for Brady/Giglio motions in the "
            "other Harris cases."
        ),
        "plea_offer": None,
        "plea_offer_details": None,
        "disposition": "Nolle prosequi",
        "arresting_officer": "Det. Michael Harris",
        "precinct": "Precinct 11",
        "witnesses": json.dumps(["Det. Michael Harris", "Bystander (Lamar Greene, video recording)"]),
        "prior_record": (
            "Two prior misdemeanor convictions: disorderly conduct (2021) "
            "and marijuana possession (2022). No felony record."
        ),
        "bond_status": "",
        "created_at": "2025-07-18T00:00:00",
        "updated_at": "2025-10-01T00:00:00",
    })

    return key_cases


# ---------------------------------------------------------------------------
# Random case generator
# ---------------------------------------------------------------------------

def _generate_random_case(case_num: int) -> dict:
    """Generate a single random case with realistic data."""

    # Determine severity
    severity = "felony" if random.random() < 0.35 else "misdemeanor"

    # Pick charges
    if severity == "felony":
        num_charges = random.choices([1, 2, 3], weights=[0.5, 0.35, 0.15])[0]
        charges = random.sample(FELONY_CHARGES, min(num_charges, len(FELONY_CHARGES)))
        # Sometimes add a misdemeanor charge alongside the felony
        if num_charges > 1 and random.random() < 0.3:
            charges[-1] = random.choice(MISDEMEANOR_CHARGES)
    else:
        num_charges = random.choices([1, 2, 3], weights=[0.55, 0.35, 0.1])[0]
        charges = random.sample(MISDEMEANOR_CHARGES, min(num_charges, len(MISDEMEANOR_CHARGES)))

    # Status distribution
    status = random.choices(
        ["active", "plea_pending", "trial_scheduled", "closed", "bench_warrant"],
        weights=[0.70, 0.10, 0.08, 0.07, 0.05],
    )[0]

    # Dates
    # Filing dates range from Jan 2025 to Jan 2026
    filing_offset = random.randint(0, 390)
    filing_date = datetime(2025, 1, 1) + timedelta(days=filing_offset)
    if filing_date > datetime(2026, 1, 31):
        filing_date = datetime(2026, 1, random.randint(1, 31))
    arrest_date = filing_date - timedelta(days=random.randint(1, 5))

    # Next hearing date (most in Feb-Apr 2026)
    if status in ("active", "plea_pending", "trial_scheduled"):
        hearing_base = datetime(2026, 2, 10)
        hearing_offset = random.randint(1, 60)
        next_hearing_date = (hearing_base + timedelta(days=hearing_offset)).strftime("%Y-%m-%d")
        if status == "trial_scheduled":
            hearing_type = "Trial"
        elif status == "plea_pending":
            hearing_type = random.choice(["Status Conference", "Sentencing", "Calendar Call"])
        else:
            hearing_type = random.choice(HEARING_TYPES)
    else:
        next_hearing_date = None
        hearing_type = None

    # Names
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    defendant_name = f"{first} {last}"

    court = random.choice(COURTS)
    judge = random.choice(JUDGES)
    prosecutor = random.choice(PROSECUTORS)
    officer = random.choice(OFFICERS)
    precinct = random.choice(PRECINCTS)

    # Defendant demographics
    age = random.randint(18, 62)
    dob_year = 2026 - age
    dob = datetime(dob_year, random.randint(1, 12), random.randint(1, 28))
    address = random.choice(ADDRESSES)
    employment = random.choice(EMPLOYMENTS)

    # Incident narrative (detailed paragraph)
    narrative_template = random.choice(INCIDENT_NARRATIVES)
    incident_narrative = narrative_template.format(
        date=arrest_date.strftime("%B %d, %Y"),
        time=random.choice(INCIDENT_TIMES),
        call_type=random.choice(INCIDENT_CALL_TYPES),
        location=random.choice(LOCATIONS),
        officer=officer,
        detail=random.choice(INCIDENT_DETAILS),
        action=random.choice(INCIDENT_ACTIONS),
        outcome=random.choice(INCIDENT_OUTCOMES),
        reason=random.choice([
            "a broken taillight", "erratic lane changes", "expired registration",
            "failure to signal", "running a red light", "speeding (52 in a 35 zone)",
            "matching the description of a suspect from a nearby incident",
        ]),
    )

    # Victim information (for ~60% of cases)
    victim_info = ""
    if random.random() < 0.60:
        vname = random.choice(VICTIM_NAMES)
        vage = random.randint(19, 70)
        vrelation = random.choice(VICTIM_RELATIONS)
        vstatus = random.choice(VICTIM_STATUSES)
        victim_template = random.choice(VICTIM_INFO)
        victim_info = victim_template.format(
            vname=vname, vage=vage, vrelation=vrelation, vstatus=vstatus,
        )

    # Evidence summary (richer: narrative + physical items + chain of custody)
    template = random.choice(EVIDENCE_TEMPLATES)
    evidence_summary = template.format(
        detail=random.choice(EVIDENCE_DETAILS),
        witness_info=random.choice(WITNESS_INFO_TEMPLATES),
        physical_evidence=random.choice(PHYSICAL_EVIDENCE),
        location=random.choice(LOCATIONS),
    )
    # Add extra evidence details
    evidence_summary += " " + random.choice([
        "Case is pending lab results.",
        "All evidence has been processed and cataloged.",
        "Additional forensic analysis has been requested.",
        "Evidence was collected following standard department protocols.",
        "Chain of custody documentation is complete.",
        "Video evidence has been reviewed by the defense.",
        "Defendant was read Miranda rights at the scene.",
        "Defendant invoked right to counsel upon arrest.",
    ])
    # 50% chance of a second physical evidence item
    if random.random() < 0.50:
        evidence_summary += " Additionally, " + random.choice(PHYSICAL_EVIDENCE).lower() + "."

    # Notes (richer — demographics + incident + victim + case notes)
    notes_template = random.choice(NOTES_TEMPLATES)
    disc_date_obj = filing_date + timedelta(days=random.randint(10, 30))
    contact_date_obj = datetime(2026, 1, random.randint(5, 31))
    case_notes = notes_template.format(
        extra=random.choice(NOTES_EXTRAS),
        task=random.choice(NOTES_TASKS),
        situation=random.choice(NOTES_SITUATIONS),
        disc_date=disc_date_obj.strftime("%B %d, %Y"),
        contact_date=contact_date_obj.strftime("%B %d, %Y"),
    )

    # Build comprehensive notes with demographics, incident, victim info
    notes_parts = []
    notes_parts.append(f"DOB: {dob.strftime('%m/%d/%Y')} (age {age}). Address: {address}. {employment}.")
    notes_parts.append(f"Incident: {incident_narrative}")
    if victim_info:
        notes_parts.append(victim_info)
    notes_parts.append(case_notes)
    # Add mitigating factor for ~40% of cases
    if random.random() < 0.40:
        notes_parts.append(f"Mitigating: {random.choice(MITIGATING_FACTORS)}")
    # Co-defendant for ~15% of cases
    if random.random() < 0.15:
        codef = random.choice(CO_DEFENDANT_NAMES)
        notes_parts.append(f"Co-defendant: {codef} (case pending separately). Severance may be requested.")
    notes = " ".join(notes_parts)

    # Attorney notes (richer — strategic analysis)
    atty_template = random.choice(ATTORNEY_NOTES_TEMPLATES)
    atty_date_obj = datetime(2026, 1, random.randint(5, 28))
    attorney_notes = atty_template.format(
        observation=random.choice(ATTORNEY_OBSERVATIONS),
        strategy=random.choice(ATTORNEY_STRATEGIES),
        date=atty_date_obj.strftime("%B %d, %Y"),
    )
    # Add a second observation ~50% of the time
    if random.random() < 0.50:
        attorney_notes += f" Also noted: {random.choice(ATTORNEY_OBSERVATIONS).lower()}."

    # Plea offer (~40% of non-closed cases)
    plea_offer = None
    plea_offer_details = None
    if status not in ("closed",) and random.random() < 0.40:
        plea_offer = random.choice(PLEA_OFFERS)
        offer_template = random.choice(PLEA_DETAILS_TEMPLATES)
        expiry_date = datetime(2026, 2, 10) + timedelta(days=random.randint(14, 60))
        plea_offer_details = offer_template.format(
            offer=plea_offer,
            charge=charges[0],
            condition=random.choice(PLEA_CONDITIONS),
            extra=random.choice([
                "Client is considering the offer.",
                "Discussed with client, who wants to counter.",
                "Client has rejected this offer.",
                "Awaiting client's decision.",
                "Offer seems reasonable given the facts.",
                "Offer may be negotiable.",
            ]),
            expiry=expiry_date.strftime("%B %d, %Y"),
        )

    # Disposition
    disposition = None
    if status == "closed":
        disposition = random.choice([
            "Guilty plea — sentenced per agreement",
            "Dismissed — insufficient evidence",
            "Dismissed — victim declined to prosecute",
            "Nolle prosequi",
            "Found guilty at trial",
            "Acquitted at trial",
            "Dismissed — completed pretrial diversion",
        ])

    # Witnesses
    num_witnesses = random.randint(1, 3)
    witness_pool = []
    for _ in range(num_witnesses):
        w_first = random.choice(FIRST_NAMES)
        w_last = random.choice(LAST_NAMES)
        w_role = random.choice([
            "(witness)", "(victim)", "(responding officer)",
            "(neighbor)", "(bystander)", "(store employee)",
        ])
        witness_pool.append(f"{w_first} {w_last} {w_role}")
    witnesses = json.dumps(witness_pool)

    # Prior record (~60% have one)
    if random.random() < 0.60:
        prior_record = random.choice(PRIOR_RECORDS)
    else:
        prior_record = random.choice([
            "No prior criminal record.",
            "No prior criminal record. First-time offender.",
            "Clean record. No prior arrests or convictions.",
        ])

    # Bond status
    if status == "bench_warrant":
        bond_status = "Revoked — bench warrant issued"
    elif severity == "felony":
        bond_status = random.choice([
            b for b in BOND_STATUSES
            if "surety" in b or "cash" in b or b in ("Remanded", "Pretrial release with GPS monitoring")
        ])
    else:
        bond_status = random.choice(BOND_STATUSES)

    case_number = f"CR-2025-{case_num:04d}"
    created_at = filing_date.strftime("%Y-%m-%dT00:00:00")
    updated_at = "2026-02-10T00:00:00"

    return {
        "case_number": case_number,
        "defendant_name": defendant_name,
        "charges": json.dumps(charges),
        "severity": severity,
        "status": status,
        "court": court,
        "judge": judge,
        "prosecutor": prosecutor,
        "next_hearing_date": next_hearing_date,
        "hearing_type": hearing_type,
        "filing_date": filing_date.strftime("%Y-%m-%d"),
        "arrest_date": arrest_date.strftime("%Y-%m-%d"),
        "evidence_summary": evidence_summary,
        "notes": notes,
        "attorney_notes": attorney_notes,
        "plea_offer": plea_offer,
        "plea_offer_details": plea_offer_details,
        "disposition": disposition,
        "arresting_officer": officer,
        "precinct": precinct,
        "witnesses": witnesses,
        "prior_record": prior_record,
        "bond_status": bond_status,
        "created_at": created_at,
        "updated_at": updated_at,
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

CASELOAD_SIZE = 500  # Realistic PD caseload (400-700 in Georgia)


def generate_demo_caseload() -> list[dict]:
    """Generate the full demo caseload (500 cases).

    Returns case dictionaries: 15 hand-crafted key cases with specific
    cross-connections for the AI to discover, plus 485 randomly generated
    cases with detailed demographics, incident narratives, victim info,
    evidence items, and attorney strategy notes.
    """
    random.seed(42)

    key_cases = _build_key_cases()
    key_case_numbers = {c["case_number"] for c in key_cases}
    num_random = CASELOAD_SIZE - len(key_cases)

    # Generate random cases, skipping case numbers reserved for key cases
    random_cases = []
    candidate_num = 1
    while len(random_cases) < num_random:
        case_number_str = f"CR-2025-{candidate_num:04d}"
        if case_number_str not in key_case_numbers:
            case = _generate_random_case(candidate_num)
            random_cases.append(case)
        candidate_num += 1

    # Combine and shuffle
    all_cases = key_cases + random_cases
    random.shuffle(all_cases)

    assert len(all_cases) == CASELOAD_SIZE, f"Expected {CASELOAD_SIZE} cases, got {len(all_cases)}"
    return all_cases


def generate_demo_evidence(cases: list[dict] | None = None) -> list[dict]:
    """Generate evidence items for key cases with image/video files,
    plus bulk evidence metadata for ~40% of all other cases."""
    from datetime import datetime
    now = datetime.now().isoformat()

    key_evidence = [
        # CR-2025-0047 — Marcus Thompson (Aggravated Assault)
        {
            "case_number": "CR-2025-0047",
            "evidence_type": "surveillance",
            "title": "Bar Exterior Surveillance - CAM 03",
            "description": (
                "Security camera footage from Edgewood Bar exterior camera (CAM 03). "
                "Shows two figures near the entrance at 11:42 PM on 09/17/2025. "
                "Image quality is poor due to low lighting. Faces are not clearly "
                "identifiable. One figure appears to be in an aggressive posture."
            ),
            "file_path": "/static/evidence/CR-2025-0047_surveillance_bar.mp4",
            "poster_path": "/static/evidence/CR-2025-0047_surveillance_bar.png",
            "source": "Edgewood Bar security system",
            "date_collected": "2025-09-18",
            "created_at": now,
        },
        {
            "case_number": "CR-2025-0047",
            "evidence_type": "medical",
            "title": "Victim Injury Photo - Jaw Area",
            "description": (
                "Medical photography from Grady Memorial Hospital documenting "
                "the victim's jaw injury. Shows bruising and swelling consistent "
                "with blunt force trauma. Taken day after the incident. Includes "
                "measurement scale. Victim subsequently underwent surgical repair "
                "for a broken jaw."
            ),
            "file_path": "/static/evidence/CR-2025-0047_injury_jaw.png",
            "source": "Grady Memorial Hospital - Medical Photography",
            "date_collected": "2025-09-18",
            "created_at": now,
        },
        # CR-2025-0012 — DeShawn Williams (Drug Possession / Rodriguez stop)
        {
            "case_number": "CR-2025-0012",
            "evidence_type": "dashcam",
            "title": "Dashcam - Traffic Stop Initiation",
            "description": (
                "Dashcam footage from Unit 1447 (Officer J. Rodriguez) showing "
                "the traffic stop of defendant's vehicle on 06/12/2025 at 9:23 PM. "
                "Camera shows defendant's vehicle ahead with taillights visible. "
                "Red/blue lights activated. GPS coordinates place the stop on "
                "Fulton Industrial Blvd. Speed reads 0 MPH (vehicle stopped). "
                "Critical question: does footage show the alleged lane change "
                "violation that justified the stop?"
            ),
            "file_path": "/static/evidence/CR-2025-0012_dashcam_stop.mp4",
            "poster_path": "/static/evidence/CR-2025-0012_dashcam_stop.png",
            "source": "APD Unit 1447 dashcam system",
            "date_collected": "2025-06-12",
            "created_at": now,
        },
        # CR-2025-0089 — Antonio Reeves (Drug Possession / Rodriguez)
        {
            "case_number": "CR-2025-0089",
            "evidence_type": "physical",
            "title": "Seized Substance and Scale - Evidence Photo",
            "description": (
                "APD Evidence Unit photograph of items seized from defendant's "
                "vehicle. Shows 5 individual baggies containing white crystalline "
                "substance (presumptive positive for methamphetamine) and a "
                "digital scale reading 4.7g. Items were found in a backpack on "
                "the rear seat during a search Officer Rodriguez claims was "
                "consensual. Defendant denies consent. Body camera footage is "
                "'unavailable due to equipment malfunction.'"
            ),
            "file_path": "/static/evidence/CR-2025-0089_evidence_drugs.png",
            "source": "APD Evidence Unit - Tech. Williams",
            "date_collected": "2025-08-19",
            "created_at": now,
        },
        # CR-2025-0101 — Tyrone Washington (Armed Robbery)
        {
            "case_number": "CR-2025-0101",
            "evidence_type": "document",
            "title": "Photo Lineup Array - Witness Identification",
            "description": (
                "Photo lineup array presented to eyewitness James Patterson on "
                "09/05/2025 by Det. Sarah Chen. Patterson selected position #4 "
                "and identified the individual as the robbery suspect. Patterson's "
                "stated confidence level was 'pretty sure' — notably not a high-"
                "confidence identification. Array contains 6 photographs. Defense "
                "should examine whether the lineup procedure was suggestive and "
                "whether position #4 stands out from the fillers."
            ),
            "file_path": "/static/evidence/CR-2025-0101_photo_lineup.png",
            "source": "APD Criminal Investigation Division",
            "date_collected": "2025-09-05",
            "created_at": now,
        },
        # CR-2025-0118 — Jerome Adams (Det. Harris encounter)
        {
            "case_number": "CR-2025-0118",
            "evidence_type": "video",
            "title": "Bystander Video - Harris Street Encounter",
            "description": (
                "Cell phone video recorded by bystander Lamar Greene on "
                "07/15/2025 in the Bankhead neighborhood. Duration: 47 seconds. "
                "Video shows Det. Michael Harris grabbing the defendant's arm "
                "BEFORE identifying himself as law enforcement. This contradicts "
                "Harris's official report. This footage led to the IAB complaint "
                "against Harris and the dismissal of charges. Critical "
                "impeachment material for other Harris cases (CR-2025-0015, "
                "CR-2025-0067)."
            ),
            "file_path": "/static/evidence/CR-2025-0118_bystander_video.mp4",
            "poster_path": "/static/evidence/CR-2025-0118_bystander_video.png",
            "source": "Bystander recording - Lamar Greene (iPhone)",
            "date_collected": "2025-07-15",
            "created_at": now,
        },
        # CR-2025-0134 — Omar Hassan (Burglary)
        {
            "case_number": "CR-2025-0134",
            "evidence_type": "crime_scene",
            "title": "Crime Scene Photo - Broken Window",
            "description": (
                "APD Crime Scene Unit photograph of the broken window at the "
                "commercial property on Buford Hwy. Evidence marker #1 visible. "
                "Photo taken at 3:15 AM on 11/12/2025 when responding officers "
                "found the defendant inside. Window shows impact pattern "
                "consistent with external force. However, defendant claims the "
                "door was unlocked and he entered seeking shelter. The broken "
                "window may have been pre-existing. Defense should investigate "
                "whether the property owner reported the broken window prior to "
                "this incident."
            ),
            "file_path": "/static/evidence/CR-2025-0134_crime_scene_window.png",
            "source": "APD Crime Scene Unit",
            "date_collected": "2025-11-12",
            "created_at": now,
        },
        # CR-2025-0142 — Keisha Johnson (Prescription pills)
        {
            "case_number": "CR-2025-0142",
            "evidence_type": "physical",
            "title": "Prescription Bottle - Evidence Photo",
            "description": (
                "Evidence photograph of prescription pill bottle and 8 loose "
                "Alprazolam (Xanax) 0.5mg pills recovered from defendant's "
                "purse during an inventory search. Bottle is prescribed to "
                "Gloria Johnson (defendant's mother), NOT the defendant. "
                "Defendant states she was picking up the prescription from the "
                "pharmacy on her mother's behalf. Mother has a valid prescription. "
                "The search was conducted incident to arrest for expired "
                "registration — a typically non-arrestable offense."
            ),
            "file_path": "/static/evidence/CR-2025-0142_prescription_bottle.png",
            "source": "APD Evidence Unit",
            "date_collected": "2025-10-07",
            "created_at": now,
        },
    ]

    # Add bulk evidence for generated cases
    if cases:
        bulk = _generate_bulk_evidence(cases)
        return key_evidence + bulk
    return key_evidence


def _generate_bulk_evidence(cases: list[dict]) -> list[dict]:
    """Generate evidence items for generated cases (not just key cases).

    Creates 1-4 evidence records per case for ~40% of cases,
    giving the caseload ~200+ evidence items total.
    Evidence records are metadata-only (no file_path) — they represent
    items logged in the case management system.
    """
    random.seed(99)
    from datetime import datetime
    now = datetime.now().isoformat()

    key_case_numbers = {
        "CR-2025-0047", "CR-2025-0012", "CR-2025-0089", "CR-2025-0142",
        "CR-2025-0023", "CR-2025-0056", "CR-2025-0078", "CR-2025-0101",
        "CR-2025-0033", "CR-2025-0015", "CR-2025-0067", "CR-2025-0134",
        "CR-2025-0155", "CR-2025-0163", "CR-2025-0118",
    }

    EVIDENCE_CATALOG = {
        "DUI": [
            ("dashcam", "Dashcam - Traffic Stop", "Patrol vehicle dashcam recording of the traffic stop and field sobriety test administration"),
            ("document", "BAC Test Results", "Blood alcohol content test results from Intoxilyzer 9000 at the precinct"),
            ("body_cam", "Body Camera - Field Sobriety", "Officer body camera recording of field sobriety test and arrest"),
            ("document", "Incident Report", "Responding officer's incident report with timeline and observations"),
        ],
        "Drug Possession": [
            ("physical", "Seized Substance - Evidence Photo", "Evidence photograph of controlled substance recovered during search"),
            ("document", "Lab Analysis Report", "GBI Crime Lab analysis of seized substance with weight and composition"),
            ("body_cam", "Body Camera - Search", "Officer body camera recording during vehicle/person search"),
            ("document", "Chain of Custody Log", "Evidence chain of custody documentation from seizure to lab"),
        ],
        "Assault": [
            ("medical", "Victim Injury Documentation", "Medical photographs documenting victim injuries taken at hospital"),
            ("document", "Victim Statement", "Written statement provided by the victim to responding officers"),
            ("surveillance", "Nearby Business Surveillance", "Security camera footage from nearby business showing the area at time of incident"),
            ("document", "911 Call Transcript", "Transcript of the 911 call reporting the incident"),
        ],
        "Battery": [
            ("medical", "Victim Medical Records", "Emergency room records documenting injuries sustained by the victim"),
            ("body_cam", "Body Camera - Arrest", "Responding officer body camera recording of arrest and initial statements"),
            ("document", "Witness Statement", "Written statement from civilian witness to the altercation"),
        ],
        "Theft": [
            ("surveillance", "Store Surveillance Footage", "Loss prevention camera footage showing the alleged theft"),
            ("document", "Store Incident Report", "Loss prevention officer's written report of the incident"),
            ("physical", "Recovered Merchandise", "Evidence photograph of recovered stolen merchandise with price tags"),
        ],
        "Burglary": [
            ("crime_scene", "Point of Entry Photo", "Crime scene photograph of the point of entry showing damage"),
            ("physical", "Fingerprint Lift Card", "Latent fingerprint recovered from point of entry — submitted to AFIS"),
            ("document", "Property Owner Statement", "Written statement from the property owner detailing missing/damaged items"),
            ("surveillance", "Exterior Camera Footage", "Security camera footage from the building exterior showing activity at time of incident"),
        ],
        "Robbery": [
            ("surveillance", "Store Camera Footage", "Interior surveillance camera footage from the store during the robbery"),
            ("document", "Victim Statement", "Victim's written account of the robbery including suspect description"),
            ("document", "Photo Lineup Results", "Detective's report on photo lineup identification procedure and results"),
            ("physical", "Weapon Recovery Photo", "Evidence photograph of weapon recovered at/near the scene"),
        ],
        "Domestic Violence": [
            ("medical", "Victim Injury Photos", "Medical documentation of injuries photographed at the hospital"),
            ("document", "Victim Statement", "Written statement from the victim describing the incident"),
            ("body_cam", "Body Camera - Response", "Responding officer body camera recording of the domestic call"),
            ("document", "Prior Incident History", "Records of prior domestic calls to the same address"),
        ],
        "Weapons": [
            ("physical", "Seized Firearm Photo", "Evidence photograph of recovered firearm with serial number visible"),
            ("document", "ATF Trace Results", "ATF firearm trace results showing ownership and purchase history"),
            ("body_cam", "Body Camera - Recovery", "Officer body camera recording of weapon recovery"),
        ],
        "Trespass": [
            ("document", "Property Owner Complaint", "Written complaint from property owner regarding unauthorized entry"),
            ("body_cam", "Body Camera - Arrest", "Officer body camera recording of arrest at the location"),
        ],
        "Shoplifting": [
            ("surveillance", "Store Camera Footage", "Loss prevention camera footage of the alleged shoplifting"),
            ("document", "LP Officer Report", "Loss prevention officer's incident report with item list and values"),
        ],
        "default": [
            ("document", "Police Incident Report", "Responding officer's written incident report"),
            ("body_cam", "Body Camera Footage", "Officer body camera recording from the incident"),
            ("document", "Witness Statement", "Written statement from a witness to the incident"),
        ],
    }

    SOURCES = [
        "APD Evidence Unit", "APD Crime Scene Unit", "APD Body Camera Division",
        "Fulton County DA's Office", "GBI Crime Lab", "Atlanta Municipal PD",
        "DeKalb County PD", "Store Loss Prevention", "Hospital Medical Records",
        "Responding Officer", "Detective Division",
    ]

    evidence_items = []

    for case in cases:
        cn = case["case_number"]
        if cn in key_case_numbers:
            continue
        if random.random() > 0.40:
            continue

        charges_raw = case.get("charges", "[]")
        try:
            charges = json.loads(charges_raw) if isinstance(charges_raw, str) else charges_raw
        except (json.JSONDecodeError, TypeError):
            charges = []

        charge_text = " ".join(charges).lower() if charges else ""

        # Match to evidence catalog
        catalog_key = "default"
        for key in EVIDENCE_CATALOG:
            if key.lower() in charge_text:
                catalog_key = key
                break

        templates = EVIDENCE_CATALOG[catalog_key]
        num_items = random.randint(1, min(len(templates), 3))
        selected = random.sample(templates, num_items)

        filing = case.get("filing_date", "2025-06-01")

        for ev_type, title, desc in selected:
            evidence_items.append({
                "case_number": cn,
                "evidence_type": ev_type,
                "title": title,
                "description": desc,
                "file_path": "",
                "source": random.choice(SOURCES),
                "date_collected": filing,
                "created_at": now,
            })

    return evidence_items


def get_caseload_stats(cases: list[dict]) -> dict:
    """Return summary statistics about the caseload.

    Args:
        cases: List of case dictionaries as returned by generate_demo_caseload().

    Returns:
        Dictionary with counts and breakdowns of the caseload.
    """
    stats: dict = {
        "total_cases": len(cases),
        "by_severity": {"felony": 0, "misdemeanor": 0},
        "by_status": {
            "active": 0,
            "plea_pending": 0,
            "trial_scheduled": 0,
            "closed": 0,
            "bench_warrant": 0,
        },
        "upcoming_hearings": {
            "next_7_days": 0,
            "next_14_days": 0,
            "next_30_days": 0,
            "next_60_days": 0,
        },
        "plea_offers_pending": 0,
        "cases_with_prior_record": 0,
        "by_court": {},
        "by_judge": {},
        "no_hearing_scheduled": 0,
        "cases_missing_disposition": 0,
    }

    today = datetime(2026, 2, 10)

    for case in cases:
        # Severity
        sev = case.get("severity", "")
        if sev in stats["by_severity"]:
            stats["by_severity"][sev] += 1

        # Status
        status = case.get("status", "")
        if status in stats["by_status"]:
            stats["by_status"][status] += 1

        # Upcoming hearings
        nhd = case.get("next_hearing_date")
        if nhd:
            try:
                hearing_dt = datetime.strptime(nhd, "%Y-%m-%d")
                delta = (hearing_dt - today).days
                if 0 <= delta <= 7:
                    stats["upcoming_hearings"]["next_7_days"] += 1
                if 0 <= delta <= 14:
                    stats["upcoming_hearings"]["next_14_days"] += 1
                if 0 <= delta <= 30:
                    stats["upcoming_hearings"]["next_30_days"] += 1
                if 0 <= delta <= 60:
                    stats["upcoming_hearings"]["next_60_days"] += 1
            except ValueError:
                pass
        else:
            if status not in ("closed",):
                stats["no_hearing_scheduled"] += 1

        # Plea offers
        if case.get("plea_offer"):
            stats["plea_offers_pending"] += 1

        # Prior record
        prior = case.get("prior_record", "")
        if prior and "no prior" not in prior.lower() and "clean record" not in prior.lower() and "first-time" not in prior.lower():
            stats["cases_with_prior_record"] += 1

        # Court
        court = case.get("court", "Unknown")
        stats["by_court"][court] = stats["by_court"].get(court, 0) + 1

        # Judge
        judge = case.get("judge", "Unknown")
        stats["by_judge"][judge] = stats["by_judge"].get(judge, 0) + 1

        # Missing disposition for closed cases
        if status == "closed" and not case.get("disposition"):
            stats["cases_missing_disposition"] += 1

    return stats


# ---------------------------------------------------------------------------
# CLI convenience — run directly to see stats
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import pprint

    cases = generate_demo_caseload()
    stats = get_caseload_stats(cases)

    print(f"Generated {len(cases)} cases.\n")
    print("Caseload Statistics:")
    print("=" * 60)
    pprint.pprint(stats)

    # Print key cases for verification
    key_numbers = [
        "CR-2025-0047", "CR-2025-0012", "CR-2025-0089", "CR-2025-0142",
        "CR-2025-0023", "CR-2025-0056", "CR-2025-0078", "CR-2025-0101",
        "CR-2025-0033", "CR-2025-0015", "CR-2025-0067", "CR-2025-0134",
        "CR-2025-0155", "CR-2025-0163", "CR-2025-0118",
    ]
    print("\n\nKey Cases Verification:")
    print("=" * 60)
    for case in sorted(cases, key=lambda c: c["case_number"]):
        if case["case_number"] in key_numbers:
            print(f"\n{case['case_number']} — {case['defendant_name']}")
            print(f"  Charges: {case['charges']}")
            print(f"  Status: {case['status']}")
            print(f"  Officer: {case['arresting_officer']}")
            print(f"  Next Hearing: {case['next_hearing_date']}")
