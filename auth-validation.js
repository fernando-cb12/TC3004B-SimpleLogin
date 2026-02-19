const AuthValidation = (function () {
  const VALID_CREDENTIALS = {
    email: "user@email.com",
    password: "pass123",
  };

  const MIN_PASSWORD_LENGTH = 6;
  const MIN_NAME_LENGTH = 2;

  function validateLogin(email, password) {
    if (!email || !password) {
      return { valid: false, message: "Email and password are required." };
    }
    if (
      email !== VALID_CREDENTIALS.email ||
      password !== VALID_CREDENTIALS.password
    ) {
      return { valid: false, message: "Invalid email or password." };
    }
    return { valid: true };
  }

  function validateRegister(name, email, password) {
    if (!name || !email || !password) {
      return { valid: false, message: "All fields are required." };
    }
    if (name.length < MIN_NAME_LENGTH) {
      return { valid: false, message: "Name must be at least 2 characters." };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, message: "Please enter a valid email." };
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return {
        valid: false,
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      };
    }
    return { valid: true };
  }

  function showError(message) {
    const existing = document.querySelector(".auth-validation-error");
    if (existing) existing.remove();

    const el = document.createElement("p");
    el.className = "auth-validation-error";
    el.textContent = message;
    el.style.cssText = "color:#ef4444;font-size:0.85rem;margin-top:0.5rem;";
    const container = document.querySelector(".login-container");
    if (container) container.appendChild(el);
  }

  function clearError() {
    const el = document.querySelector(".auth-validation-error");
    if (el) el.remove();
  }

  function handleLogin(event) {
    clearError();
    const email = document.getElementById("login-email")?.value?.trim() ?? "";
    const password = document.getElementById("login-password")?.value ?? "";
    const result = validateLogin(email, password);

    if (!result.valid) {
      showError(result.message);
      return;
    }
    window.location.href = "main.html";
  }

  function handleRegister(event) {
    clearError();
    const name = document.getElementById("register-name")?.value?.trim() ?? "";
    const email =
      document.getElementById("register-email")?.value?.trim() ?? "";
    const password = document.getElementById("register-password")?.value ?? "";
    const result = validateRegister(name, email, password);

    if (!result.valid) {
      showError(result.message);
      return;
    }
    window.location.href = "index.html";
  }

  return {
    validateLogin,
    validateRegister,
    handleLogin,
    handleRegister,
  };
})();
