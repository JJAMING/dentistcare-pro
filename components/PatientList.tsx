import { useEffect, useState } from "react";
import { fetchReceptionList } from "../services/dentwebService";

function PatientList() {
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetchReceptionList("20260201") // 테스트 날짜
      .then((res) => {
        console.log("DentWeb 데이터:", res);
        setData(res);
      })
      .catch((err) => {
        console.error(err);
        setError("API 호출 실패");
      });
  }, []);

  return (
    <div style={{ padding: "16px" }}>
      <h2>접수 목록 테스트</h2>

      {error && <div style={{ color: "red" }}>{error}</div>}

      <pre style={{ background: "#f5f5f5", padding: "12px" }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export default PatientList;
