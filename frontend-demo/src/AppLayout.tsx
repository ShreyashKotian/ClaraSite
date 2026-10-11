import { Outlet } from "react-router-dom";
import { useAssistantWs } from "./hooks/useAssistantWs";
import { Sidebar } from "./components/Sidebar";
import styles from "./App.module.css";

export function AppLayout() {
  const assistant = useAssistantWs();
  const isLive = assistant.status === "live";

  return (
    <div className={styles.shell}>
      <div className={styles.shellMain}>
        <Sidebar isLive={isLive} />
        <div className={styles.workspace}>
          <Outlet context={assistant} />
        </div>
      </div>
    </div>
  );
}
