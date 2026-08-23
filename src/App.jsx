import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "./services/supabase";
import { useShiftData } from "./hooks/useShiftData";

import Auth from "./components/Auth";
import Header from "./components/Header";
import Calendar from "./components/Calendar";
import CompOffLedger from "./components/CompOffLedger";
import DayModal from "./components/DayModal";
import SettingsModal from "./components/SettingsModal";
import StatusScreen from "./components/common/StatusScreen";

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured) {
      setAuthError("Add your Supabase URL and anon key to a .env file first (see .env.example).");
      setAuthChecked(true);
      return () => {
        mounted = false;
      };
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setAuthError(error.message);
      if (data.session) setUser(data.session.user);
      setAuthChecked(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setUser(null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (!authChecked) {
    return <StatusScreen message="Loading your tracker..." />;
  }

  if (!user) {
    return (
      <>
        <Auth onSignedIn={setUser} />
        {authError && <div className="global-auth-note">{authError}</div>}
      </>
    );
  }

  return <ChroniqApp user={user} onLogout={handleLogout} />;
}

function ChroniqApp({ user, onLogout }) {
  const data = useShiftData(user);

  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [activeDay, setActiveDay] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rangePreviewDays, setRangePreviewDays] = useState(new Set());

  const openDay = (day) => {
    setActiveDay(day);
    setDayModalOpen(true);
  };

  const closeDay = () => {
    setDayModalOpen(false);
    setActiveDay(null);
    setRangePreviewDays(new Set());
  };

  if (data.loading) {
    return <StatusScreen message="Loading your tracker..." />;
  }

  if (data.error) {
    return (
      <StatusScreen
        message={`Could not load your tracker data. ${data.error}`}
        isError
        onRetry={data.reload}
      />
    );
  }

  return (
    <div className="wrap">
      <Header saved={data.saved} onLogout={onLogout} />

      <main className="dashboard-layout">
        <section className="calendar-panel">
          <Calendar
            current={data.current}
            monthData={data.monthData}
            defaults={data.defaults}
            onPrevMonth={data.goToPrevMonth}
            onNextMonth={data.goToNextMonth}
            onSelectMonth={data.goToMonth}
            onSelectYear={data.goToYear}
            onOpenSettings={() => setSettingsOpen(true)}
            onDayClick={openDay}
            rangePreviewDays={rangePreviewDays}
          />
        </section>

        <CompOffLedger
          monthCache={data.monthCache}
          usage={data.usage}
          onToggleUsed={data.saveUsageValue}
        />
      </main>

      <footer>Incendiary | Arpit Kumar</footer>

      <DayModal
        open={dayModalOpen}
        day={activeDay}
        current={data.current}
        entryData={activeDay != null ? data.monthData[activeDay] : null}
        defaults={data.defaults}
        onSave={(keys, entry) => data.applyToDates(keys, entry)}
        onClear={(keys) => data.applyToDates(keys, null)}
        onClose={closeDay}
        onRangePreviewChange={setRangePreviewDays}
      />

      <SettingsModal
        open={settingsOpen}
        defaults={data.defaults}
        onSave={data.saveDefaultsToDb}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
