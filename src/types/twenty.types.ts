export interface TwentyApiResponse {
  data?: any;
  errors?: Array<{
    message: string;
    extensions?: any;
  }>;
}

export interface TwentyCompanyUpdate {
  [key: string]: any;
}

export interface TwentyPerson {
  email?: string;
  name?: {
    firstName?: string;
    lastName?: string;
  };
  jobTitle?: string;
  companyId?: string;
  linkedIn?: {
    primaryLinkUrl?: string;
  };
  xLink?: {
    primaryLinkUrl?: string;
  };
  [key: string]: any;
}

export interface TwentyNote {
  title?: string;
  body?: string;
  [key: string]: any;
}

export interface TwentyNoteTarget {
  noteId: string;
  companyId?: string;
  personId?: string;
  [key: string]: any;
}