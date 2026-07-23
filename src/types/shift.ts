export interface OfficeShift {
  id: string;
  office_id: string;
  check_in_time: string;
  late_threshold: string;
  check_out_time: string;
  created_at: string;
  updated_at: string;
  office?: {
    name: string;
  };
}

export interface OfficeShiftInput {
  office_id: string;
  check_in_time: string;
  late_threshold: string;
  check_out_time: string;
}
