const PAINEL_SENHA = process.env.PAINEL_SENHA;

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const body = await req.json();
  if (body.senha === PAINEL_SENHA) {
    return new Response(JSON.stringify({ ok: true, token: Buffer.from(PAINEL_SENHA).toString('base64') }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'Content-Type': 'application/json' } });
}

export const config = { runtime: 'edge' };
