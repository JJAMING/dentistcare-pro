const API_BASE_URL = "http://192.168.0.35:8080"; // 노트북 IP
const API_KEY = "12ada513asf1s25s1f_API_KEY";

export async function fetchReceptionList(date: string) {
  const res = await fetch(
    `${API_BASE_URL}/reception?date=${date}`,
    {
      headers: {
        "x-api-key": API_KEY,
      },
    }
  );

  if (!res.ok) {
    throw new Error("DentWeb API 호출 실패");
  }

  return res.json();
}
