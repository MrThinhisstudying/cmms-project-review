export interface ITrainingProgram {
    id: number;
    group_name: string;
    code: string;
    name: string;
    validity_months: number;
    evaluation_days: number;
}

export type CertificateType = 'CCCM' | 'QDCN' | 'GIAY_PHEP' | 'NANG_DINH' | 'BANG_CAP';
export type CertificateStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';

export interface IEmployeeCertificate {
    id: number;
    user: any; // IUser but kept generic here
    program: ITrainingProgram | null;
    type: CertificateType;
    file_url: string | null;
    start_date: string | null;
    end_date: string | null;
    decision_number: string | null;
    issue_date: string | null;
    certificate_number: string | null;
    return_date: string | null;
    evaluation_submit_date: string | null;
    next_training_date: string | null;
    status: CertificateStatus;
    grading?: string;
    evaluation_days?: number;
    // Bằng cấp fields
    degree_type?: string;
    major?: string;
    school_name?: string;
    graduation_year?: number;
    study_mode?: string;
    // GPLX fields
    license_class?: string;
    issuing_place?: string;
    expiry_date?: string | null;
    is_permanent?: boolean;
    qualification_type?: string;
}

export type RequirementStatus = 'PENDING' | 'FULFILLED';

export interface IUserTrainingRequirement {
    id: number;
    program: ITrainingProgram;
    status: RequirementStatus;
    required_date?: string;
    note?: string;
}

export interface ICreateTrainingRequirement {
    program_id: number;
    required_date?: string;
    note?: string;
    status?: RequirementStatus;
}
