export const setToken = (token: string, remember: boolean) => {
  if (remember) {
    localStorage.setItem("id_token", token);
  } else {
    sessionStorage.setItem("id_token", token);
  }
};

export const getToken = (): string | null => {
  return localStorage.getItem("id_token") || sessionStorage.getItem("id_token");
};

export const removeToken = () => {
  localStorage.removeItem("id_token");
  sessionStorage.removeItem("id_token");
};
