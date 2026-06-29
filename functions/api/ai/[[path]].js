export async function onRequest({ env, request }) {
  if (!env.API_WORKER) {
    return Response.json(
      {
        ok: false,
        error: "Missing Pages service binding: API_WORKER"
      },
      { status: 500 }
    );
  }

  return env.API_WORKER.fetch(request);
}
