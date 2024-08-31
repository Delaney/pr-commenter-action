import { MinimatchOptions } from "minimatch";

export type ConfigObject = {
    comment: CommentObject;
};

export type CommentObject = {
    header: string | null;
    footer: string | null;
    snippets: SnippetObject[];
    'on-create'?: string | null;
    'on-update'?: string | null;
    'glob-options'?: object;
}

export type SnippetObject = {
    id: string;
    body: string;
    files: (string | MatchConfig)[];
};

export type Comment = {
    id: number;
    url: string;
    created_at: string;
    body?: string;
    body_text?: string;
    body_html?: string;
}

export type MatchConfig = {
    any?: string[];
    all?: string[];
};

export interface CommentConfig extends Map<string, unknown> {
    get(key: 'on-create' | 'on-update' | 'globOptions' | 'snippets'): Map<string, unknown>[];
    get(key: 'globOptions'): MinimatchOptions | undefined;
}

export interface Snippet extends Map<string, unknown> {
    get(key: 'id' | 'body'): string;
    get(key: 'files'): (string | MatchConfig)[];
}