export type EmployeeStatus = 'active' | 'inactive';

export type EmployeeSchedule = {
    days: number[];
    start: string;
    end: string;
};

export type EmployeeFile = {
    id: number;
    title: string;
    original_name: string;
    path: string | null;
    extension: string;
    size_label: string;
    uploaded_at: string | null;
    download_url: string | null;
};

export type EmployeeListItem = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    position: string;
    joined_on: string | null;
    status: EmployeeStatus;
    salary: number | null;
    photo_url: string | null;
};

export type EmployeeRecord = EmployeeListItem & {
    manager_notes: string | null;
    schedule: EmployeeSchedule | null;
    files: EmployeeFile[];
};

export type EmployeeFormPayload = {
    name: string;
    email: string;
    phone: string;
    position: string;
    joined_on: string;
    status: EmployeeStatus;
    manager_notes: string;
    schedule: EmployeeSchedule;
};
