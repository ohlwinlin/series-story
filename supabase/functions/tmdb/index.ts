// TMDB proxy edge function — hides TMDB_API_KEY from the client bundle.
// Call: supabase.functions.invoke('tmdb', { body: { path, params } })

const TMDB_BASE = 'https://api.themoviedb.org/3';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  try {
    const apiKey = Deno.env.get('TMDB_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'TMDB_API_KEY not configured' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    const { path, params } = (await req.json()) as {
      path?: string;
      params?: Record<string, string | number | boolean | undefined>;
    };

    if (!path || typeof path !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing path' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Whitelist: only allow GET paths to /3/* — strip any leading slash and disallow protocol-relative or absolute URLs.
    const cleanPath = path.replace(/^\/+/, '');
    if (cleanPath.includes('://') || cleanPath.startsWith('//')) {
      return new Response(JSON.stringify({ error: 'Invalid path' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(`${TMDB_BASE}/${cleanPath}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') {
          url.searchParams.set(k, String(v));
        }
      }
    }
    if (!url.searchParams.has('language')) {
      url.searchParams.set('language', 'en-US');
    }

    const tmdbRes = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    const body = await tmdbRes.text();
    return new Response(body, {
      status: tmdbRes.status,
      headers: {
        ...cors,
        'Content-Type': tmdbRes.headers.get('Content-Type') ?? 'application/json',
      },
    });
  } catch (err) {
    console.error('tmdb proxy error', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? 'Unknown error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }
});