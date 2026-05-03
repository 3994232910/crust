const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
  "Content-Type": "application/json",
})

const base = () =>
  import.meta.env.DEV ? "" : (import.meta.env.VITE_API_URL ?? "")

export interface StargazingGroup {
  id: string
  name: string
  color: string
}

export async function fetchStargazingGroups(): Promise<StargazingGroup[]> {
  const r = await fetch(`${base()}/api/v1/community/stargazing/groups`, {
    headers: authHeader(),
  })
  if (!r.ok) return []
  return r.json()
}

export async function createStargazingGroup(
  name: string,
  color: string,
): Promise<StargazingGroup> {
  const r = await fetch(`${base()}/api/v1/community/stargazing/groups`, {
    method: "POST",
    headers: authHeader(),
    body: JSON.stringify({ name, color }),
  })
  return r.json()
}

export async function deleteStargazingGroup(groupId: string): Promise<void> {
  await fetch(`${base()}/api/v1/community/stargazing/groups/${groupId}`, {
    method: "DELETE",
    headers: authHeader(),
  })
}

export async function setStargazingAssignment(
  targetUserId: string,
  groupId: string | null,
): Promise<void> {
  await fetch(
    `${base()}/api/v1/community/stargazing/assignments/${targetUserId}`,
    {
      method: "PUT",
      headers: authHeader(),
      body: JSON.stringify({ group_id: groupId }),
    },
  )
}
