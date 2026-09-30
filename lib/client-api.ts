export async function clientApi<T = any>(url: string, method = 'GET', body?: any): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })

  const text = await response.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }

  if (!response.ok) {
    throw new Error(data?.error || `Operação não concluída (${response.status})`)
  }
  return data as T
}
