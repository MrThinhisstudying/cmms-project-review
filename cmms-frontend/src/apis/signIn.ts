export const signIn = async (email: string, password: string) => {
  try {
    const response = await fetch(`${process.env.REACT_APP_BASE_URL}/auth/signIn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.accessToken;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
};
