export type ProduttivoFieldValue = {
    id?: number;
    name?: string | null;
    value?: string | string[] | null;
    accuracy?: number | null;
    notes?: string | null;
    attachment_file_name?: string | null;
    attachment_content_type?: string | null;
    attachment_url?:
        | string
        | {
            original?: string | null;
            medium?: string | null;
            thumb?: string | null;
            mini?: string | null;
        }
        | null;
    attachments?: ProduttivoTicketAttachment[];
};

export type ProduttivoMeta = {
    count?: number;
    current_page?: number;
    from?: number;
    to?: number;
    total_pages?: number;
};

export type ProduttivoListResponse<T> = {
    meta?: ProduttivoMeta;
    results?: T[];
};

export type ProduttivoWork = {
    id: number;
    title?: string | null;
    uuid?: string | null;
    work_number?: number | string | null;
    work_type?: string | null;
    form_id?: number | null;
    start_time?: string | null;
    end_time?: string | null;
    duration?: number | null;
    updated_at?: string | null;
    created_at?: string | null;
    status?: string | null;
    account_id?: number | null;
    project_id?: number | null;
    resource_place_id?: number | null;
    requested_start_time?: string | null;
    contact_name?: string | null;
    contact_mobile_phone?: string | null;
    contact_email?: string | null;
    fills_count?: number | null;
    fills_goal?: number | null;
};

export type ProduttivoManutencaoItem = {
    id: number;
    document_number?: number | string | null;
    created_at: string;
    work_id?: number | null;
    user_id?: number | null;
    field_values: ProduttivoFieldValue[];
};

export type ProduttivoInspectionFill = {
    id: number;
    document_number?: number | string | null;
    created_at: string;
    is_valid: boolean;
    field_values: ProduttivoFieldValue[];
    work_id?: number | null;
    work?: ProduttivoWork | null;
    workId?: number | null;
};

export type ProduttivoAccountMember = {
    id: number;
    name?: string | null;
    email?: string | null;
};

export type ProduttivoForm = {
    id: number;
    name?: string | null;
    status?: string | null;
};

export type ProduttivoFormOption = {
    id: number;
    name?: string | null;
    score?: string | null;
    score_enabled?: boolean;
};

export type ProduttivoFormField = {
    id: number;
    name?: string | null;
    field_type?: string | null;
    position?: number | null;
    removed?: boolean;
    mandatory?: boolean;
    enable_other_option?: boolean;
    field_options?: ProduttivoFormOption[];
};

export type ProduttivoFormSection = {
    id: number;
    name?: string | null;
    position?: number | null;
    removed?: boolean;
    fields?: ProduttivoFormField[];
};

export type ProduttivoFormDetail = {
    id: number;
    name?: string | null;
    status?: string | null;
    form_sections?: ProduttivoFormSection[];
};

export type ProduttivoFormFill = {
    id: number;
    work_id?: number | null;
    form_id?: number | null;
    status?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    field_values?: ProduttivoFieldValue[];
};

export type ProduttivoFormFillDetail = {
    id: number;
    work_id?: number | null;
    form_id?: number | null;
    status?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    field_values?: ProduttivoFieldValue[];
};

export type ProduttivoResourcePlace = {
    id: number;
    uuid?: string | null;
    name?: string | null;
    address?: string | null;
    status?: string | null;
    account_id?: number | null;
    parent_id?: number | null;
    hierarchy_level?: number | null;
    hierarchy_name?: string | null;
    resource_place_type?: string | null;
    details?: string | null;
};

export type ProduttivoTicketAttachment = {
    id: number;
    account_id?: number | null;
    title?: string | null;
    removed?: boolean;
    uuid?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    accuracy?: number | null;
    attachment_source?: string | null;
    device_created_at?: string | null;
    device_updated_at?: string | null;
    created_by_id?: number | null;
    updated_by_id?: number | null;
    file_url?: string | null;
};

export type ProduttivoTicket = {
    id: number;
    ticket_number?: number | null;
    title?: string | null;
    account_id?: number | null;
    work_id?: number | null;
    resource_place_id?: number | null;
    resource_place_type?: string | null;
    resource_place_name?: string | null;
    author_name?: string | null;
    author_email?: string | null;
    author_phone?: string | null;
    description?: string | null;
    details?: string | null;
    ticket_type?: string | null;
    status?: string | null;
    denied_details?: string | null;
    ticket_category_id?: number | null;
    ticket_category_name?: string | null;
    notify_author_by_instant_message?: boolean;
    created_at?: string | null;
    updated_at?: string | null;
    requested_start_time?: string | null;
    attachments?: ProduttivoTicketAttachment[];
};