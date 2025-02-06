import { crypto } from "https://deno.land/std@0.152.0/crypto/mod.ts";

export async function generateApiKeyHash(apiKey: string): Promise<string> {
    const hashBuffer = await crypto.subtle.digest(
        'SHA-256', 
        new TextEncoder().encode(apiKey)
    );
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
} 