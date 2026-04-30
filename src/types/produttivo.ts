export type ProduttivoFieldValue = {
    name?: string | null;
    value?: string | string[] | null;
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
    work_number?: number | string | null;
    form_id?: number | null;
    updated_at?: string | null;
    status?: string | null;
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