"use client";
import { useState, useEffect } from "react";
import { useUserStore } from "#/store/auth";
import { setJWT, tryCatchAPI } from "#/api/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { useThemeMode } from "flowbite-react";
import { toast } from "react-toastify";
import { ENDPOINTS } from "#/api/config";
import { Icon } from "#/components/Icon/Icon";

export function LoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const userStore = useUserStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || null;
  const theme = useThemeMode();
  const [isSending, setIsSending] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setIsSending(true);

    const tid = toast.loading("Выполняем вход...", {
      position: "bottom-center",
      hideProgressBar: true,
      closeOnClick: false,
      pauseOnHover: false,
      draggable: false,
      theme: theme.mode == "light" ? "light" : "dark",
    });

    const { data, error } = await tryCatchAPI(
      fetch(`${ENDPOINTS.user.auth}?login=${login}&password=${password}`, {
        method: "POST",
        headers: {
          Sign: "9aa5c7af74e8cd70c86f7f9587bde23d",
          "Content-Type": "application/x-www-form-urlencoded",
        },
      })
    );

    if (error) {
      let message = `Ошибка получения пользователя, code: ${error.code}`
      if (error.code == 2) {
        message = "Такого пользователя не существует"
      }
      if (error.code == 3) {
        message = "Неправильно указан логин и/или пароль"
      }
      toast.update(tid, {
        render: message,
        type: "error",
        autoClose: 2500,
        isLoading: false,
        closeOnClick: true,
        draggable: true,
      });
      setIsSending(false);
      return;
    }

    if (!data.profileToken) {
      toast.update(tid, {
        render: "Не удалось войти в аккаунт",
        type: "error",
        autoClose: 2500,
        isLoading: false,
        closeOnClick: true,
        draggable: true,
      });
      setIsSending(false);
      return;
    }

    userStore.login(data.profile, data.profileToken.token);
    if (remember) {
      setJWT(data.profile.id, data.profileToken.token);
    }

    toast.update(tid, {
      render: "Вход успешен!",
      type: "success",
      autoClose: 2500,
      isLoading: false,
      closeOnClick: true,
      draggable: true,
    });
  }

  useEffect(() => {
    if (userStore.user) {
      router.push(`${redirect || "/"}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userStore.user]);

  return (
    <section className="login-wrap">
      <div className="login-card">
        <div className="login-logo">
          <Icon name="login" size={22} />
        </div>
        <h1 className="login-title">Вход в аккаунт Anixart</h1>
        <p className="login-sub">
          Используйте логин и пароль от приложения Anixart
        </p>
        <form className="form" method="POST" onSubmit={submit}>
          <label htmlFor="email">Логин или эл. почта</label>
          <input
            type="text"
            name="email"
            id="email"
            placeholder="Логин или эл. почта"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required={true}
          />
          <label htmlFor="password">Пароль</label>
          <input
            type="password"
            name="password"
            id="password"
            placeholder="••••••••"
            required={true}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <label className="check" htmlFor="remember">
            <input
              id="remember"
              aria-describedby="remember"
              type="checkbox"
              required={true}
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span>Запомнить вход</span>
          </label>
          <button
            type="submit"
            className="btn p"
            style={{ width: "100%", marginTop: 18 }}
            disabled={isSending}
          >
            <Icon name="login" size={16} />
            Войти
          </button>
        </form>
      </div>
    </section>
  );
}
