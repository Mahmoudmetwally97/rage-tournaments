export interface ExtractedRow {
  name: string;
  rank: number | null;
  kills: number | null;
  deaths?: number | null;
  score?: number | null;
  confidence: number; // 0..1, the model's own certainty for this row
}

export interface ExtractedScreenshot {
  is_results_screen: boolean;
  room: string | null;   // room / lobby label as printed, e.g. "Room 3"
  round: number | null;
  mode: string | null;
  rows: ExtractedRow[];
  overall_confidence: number;
  notes?: string;
}

export interface RosterEntry {
  registration_id: string;
  ign: string;
  discord_handle?: string | null;
}

export interface MatchedRow {
  registration_id: string | null;
  ign: string | null;        // the registered name we matched to
  read_name: string;         // what the screenshot said
  rank: number | null;
  kills: number | null;
  confidence: number;        // model confidence x name match score
  match_score: number;
}

export interface RoomCandidate {
  group_id: string;
  group_name: string;        // 'Room 3'
  group_order: number;
  roster: RosterEntry[];
  matches: { match_id: string; round_number: number; status: string }[];
}

export interface Resolution {
  room: RoomCandidate | null;
  match_id: string | null;
  rows: MatchedRow[];
  issues: string[];
  confidence: number;
}
