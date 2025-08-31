export async function logError(message: string, error?: unknown): Promise<void> {
  console.error(message, error);
  try {
    await fetch('/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: 'error',
        message,
        error: error instanceof Error ? error.stack || error.message : String(error),
        timestamp: new Date().toISOString()
      })
    });
  } catch (logErr) {
    console.error('Failed to send log', logErr);
  }
}

export async function logInfo(message: string): Promise<void> {
  console.log(message);
  try {
    await fetch('/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: 'info',
        message,
        timestamp: new Date().toISOString()
      })
    });
  } catch (logErr) {
    console.error('Failed to send log', logErr);
  }
}
