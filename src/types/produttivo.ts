export type ProduttivoFieldValue = {
    name?: string | null;
    value?: string | string[] | null;
};

export type ProduttivoMeta = {
    count?: number;
};

export type ProduttivoListResponse<T> = {
    meta?: ProduttivoMeta;
    results?: T[];
};

export type ProduttivoWork = {
    id: number;
    title?: string | null;
    work_number?: number | string | null;
};

export type ProduttivoManutencaoItem = {
    id: number;
    document_number?: number | string | null;
    created_at: string;
    work_id?: number | null;
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