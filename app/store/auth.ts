"use client";
import { create } from "zustand";
import { getJWT, removeJWT, fetchDataViaGet } from "#/api/utils";
import { ENDPOINTS } from "#/api/config";

interface userState {
  _hasHydrated: boolean;
  isAuth: boolean;
  user: any | null;
  token: string | null;
  state: string;
  login: (user: Object, token: string) => void;
  logout: () => void;
  checkAuth: () => void;
}

export const useUserStore = create<userState>((set, get) => ({
  _hasHydrated: false,
  isAuth: false,
  user: null,
  token: null,
  state: "loading",

  login: (user: Object, token: string) => {
    set({
      isAuth: true,
      user: user,
      token: token,
      state: "finished",
      _hasHydrated: true,
    });
  },
  logout: () => {
    set({
      isAuth: false,
      user: null,
      token: null,
      state: "finished",
      _hasHydrated: true,
    });
    removeJWT();
  },
  checkAuth: () => {
    const jwt = getJWT();
    if (jwt) {
      const _checkAuth = async () => {
        const { data, error } = await fetchDataViaGet(
          `${ENDPOINTS.user.profile}/${jwt.user_id}?token=${jwt.jwt}`
        );

        if (error) {
          const httpStatus = Number(error?.httpStatus ?? error?.code);
          const isTemporaryError =
            (error?.httpStatus == null && error?.code == null) ||
            (Number.isFinite(httpStatus) && httpStatus >= 500);

          if (isTemporaryError) {
            // Сеть или временный 500 не доказывают, что токен недействителен.
            get().login({ id: jwt.user_id }, jwt.jwt);
          } else {
            // Постоянный отказ API (в том числе 401/403) завершает сеанс.
            get().logout();
          }
          return;
        }

        if (!data?.is_my_profile) {
          get().logout();
          return;
        }

        get().login(data.profile, jwt.jwt);
      };
      _checkAuth();
    } else {
      get().logout();
    }
  },
}));
