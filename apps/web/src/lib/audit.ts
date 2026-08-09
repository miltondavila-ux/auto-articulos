export function auditLog(
  action: string,
  userId: string,
  details?: Record<string, unknown>,
) {
  console.log(
    JSON.stringify({
      type: "audit",
      action,
      userId,
      details,
      timestamp: new Date().toISOString(),
    }),
  );
}
