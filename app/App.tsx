"use client";
import { useUserStore } from "./store/auth";
import { usePreferencesStore } from "./store/preferences";
import { Inter } from "next/font/google";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "./components/Spinner/Spinner";
import { ChangelogModal } from "#/components/ChangelogModal/ChangelogModal";
import { Bounce, ToastContainer } from "react-toastify";
import { SettingsModal } from "./components/SettingsModal/SettingsModal";
import { AppearanceProvider } from "./components/Appearance/AppearanceProvider";
import { AppearancePanel } from "./components/Appearance/AppearancePanel";
import { Navigation } from "./components/Navigation/Navigation";
import { Icon } from "./components/Icon/Icon";

const inter = Inter({ subsets: ["latin"] });

export const App = (props) => {
  const preferencesStore = usePreferencesStore();
  const userStore = useUserStore((state) => state);
  const router = useRouter();
  const [showChangelog, setShowChangelog] = useState(false);
  const [versionResponse, setVersionResponse] = useState({
    version: "",
    version_changelog: "",
    previous_changelogs: [],
  });
  const [isSettingModalOpen, setIsSettingModalOpen] = useState(false);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function _checkVersion() {
      const res = await fetch("/api/version");
      const data = await res.json();

      if (data.version !== preferencesStore.params.version) {
        setShowChangelog(true);
        setVersionResponse(data);
      }
    }

    if (preferencesStore._hasHydrated) {
      _checkVersion();
      userStore.checkAuth();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferencesStore._hasHydrated]);

  const submitSearch = () => {
    const query = searchQuery.trim();
    if (!query) return;
    router.push(`/search?query=${encodeURIComponent(query)}`);
  };

  if (!preferencesStore._hasHydrated && !userStore._hasHydrated) {
    return (
      <body
        className={`${inter.className} h-screen flex justify-center items-center`}
      >
        <Spinner />
      </body>
    );
  }

  if (userStore.state === "loading") {
    return (
      <body
        className={`${inter.className} h-screen flex justify-center items-center`}
      >
        <Spinner />
      </body>
    );
  }

  return (
    <body className={inter.className}>
      <AppearanceProvider>
        <div className="app">
          <Navigation
            setIsSettingModalOpen={setIsSettingModalOpen}
            onOpenAppearance={() => setIsAppearanceOpen(true)}
          />
          <div className="app-main">
            <main className="main">
              <div className="top">
                <input
                  type="search"
                  className="search"
                  placeholder="Поиск релизов, профилей и коллекций"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") submitSearch();
                  }}
                  aria-label="Поиск"
                />
                <button
                  type="button"
                  className="btn view-btn"
                  onClick={() => setIsAppearanceOpen(true)}
                >
                  <Icon name="settings" size={16} />
                  Вид
                </button>
              </div>
              {props.children}
            </main>
          </div>
        </div>

        <button
          type="button"
          className="fab"
          onClick={() => setIsAppearanceOpen(true)}
          aria-label="Настройки вида"
        >
          <Icon name="sparkle" size={22} />
        </button>

        <AppearancePanel
          isOpen={isAppearanceOpen}
          setIsOpen={setIsAppearanceOpen}
        />

        <ChangelogModal
          isOpen={
            showChangelog &&
            preferencesStore.flags.showChangelog &&
            !preferencesStore.params.isFirstLaunch
          }
          setIsOpen={() => {
            setShowChangelog(false);
            preferencesStore.setParams({ version: versionResponse.version });
          }}
          versionResponse={versionResponse}
        />

        {preferencesStore.params.isFirstLaunch && (
          <div
            className="md"
            onClick={() =>
              preferencesStore.setParams({ isFirstLaunch: false })
            }
          >
            <div
              className="mb"
              style={{ width: "min(560px, 100%)" }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-head">
                <h3>Внимание</h3>
                <button
                  type="button"
                  className="mb-close"
                  onClick={() =>
                    preferencesStore.setParams({ isFirstLaunch: false })
                  }
                  aria-label="Закрыть"
                >
                  <Icon name="x" size={16} />
                </button>
              </div>
              <p style={{ color: "var(--t2)", fontSize: 14 }}>
                Данный сайт не связан с разработчиками приложения Anixart, это
                неофициальная имплементация веб клиента для этого приложения.
                <br />
                <br />
                Используя данный веб-сайт вы принимаете что мы не несём
                ответственности за ваш аккаунт.
                <br />
                <br />
                На сайте могут присутствовать ошибки и не доработки, а так-же
                отсутствующий функционал.
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: 18,
                }}
              >
                <button
                  type="button"
                  className="btn p"
                  onClick={() =>
                    preferencesStore.setParams({ isFirstLaunch: false })
                  }
                >
                  Принимаю
                </button>
              </div>
            </div>
          </div>
        )}

        <SettingsModal
          isOpen={isSettingModalOpen}
          setIsOpen={setIsSettingModalOpen}
          onOpenAppearance={() => {
            setIsSettingModalOpen(false);
            setIsAppearanceOpen(true);
          }}
        />

        <ToastContainer
          className={"mx-2 mb-20 sm:mb-0"}
          position="bottom-center"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick={true}
          rtl={false}
          pauseOnFocusLoss={false}
          draggable={true}
          pauseOnHover={true}
          theme="colored"
          transition={Bounce}
        />
      </AppearanceProvider>
    </body>
  );
};
