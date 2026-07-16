export const storageRoutes = {
  '/api/storage/upload': async (request, env, user) => {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return new Response('No file provided', { status: 400 });
    }

    const key = `uploads/${user.id}/${Date.now()}_${file.name}`;
    await env.STORAGE.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        contentDisposition: `attachment; filename="${file.name}"`
      }
    });

    return new Response(JSON.stringify({
      success: true,
      key: key,
      url: `https://cyrax-ssd-storage.r2.dev/${key}`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  },

  '/api/storage/list': async (request, env, user) => {
    const objects = await env.STORAGE.list({
      prefix: `uploads/${user.id}/`
    });

    return new Response(JSON.stringify(objects.objects), {
      headers: { 'Content-Type': 'application/json' }
    });
  },

  '/api/storage/get': async (request, env, user) => {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    
    if (!key || !key.startsWith(`uploads/${user.id}/`)) {
      return new Response('Unauthorized', { status: 403 });
    }

    const object = await env.STORAGE.get(key);
    if (!object) {
      return new Response('File not found', { status: 404 });
    }

    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
        'Content-Disposition': object.httpMetadata?.contentDisposition || 'inline'
      }
    });
  }
};