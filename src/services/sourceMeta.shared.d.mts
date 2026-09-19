interface ProseNote { explains?: string; teaches?: string; plans?: string }
export declare function noteTeachesChess(note: ProseNote): boolean;
export declare function rejectionReason(note: ProseNote): 'source-meta' | 'format-meta' | null;
export declare const SOURCE_META: RegExp;
export declare const FORMAT_META: RegExp;
