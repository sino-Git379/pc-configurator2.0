(() => {
    const dialog = document.getElementById("auth-modal");
    if (!dialog) return;

    const defaultIntro = "Войдите или создайте аккаунт, чтобы сохранить сборку.";
    const intro = document.getElementById("auth-intro");
    const dialogScope = dialog.querySelector("[data-auth-scope]");
    let checkoutPending = false;
    const scopes = [...document.querySelectorAll("[data-auth-scope]")];

    function setMessage(scope, value) {
        const target = scope.querySelector("[data-auth-message]") || scope.querySelector("#auth-message");
        if (target) target.textContent = value;
    }

    window.openAuthDialog = (message = "", continueCheckout = false) => {
        checkoutPending = continueCheckout;
        intro.textContent = message || defaultIntro;
        setMessage(dialog, "");
        dialog.showModal();
    };

    document.getElementById("auth-close").addEventListener("click", () => {
        checkoutPending = false;
        intro.textContent = defaultIntro;
        dialog.close();
    });
    dialog.addEventListener("click", (event) => {
        if (event.target === dialog) {
            checkoutPending = false;
            intro.textContent = defaultIntro;
            dialog.close();
        }
    });

    for (const scope of scopes) {
        for (const tab of scope.querySelectorAll("[data-auth-tab]")) {
            tab.addEventListener("click", () => {
                const selectedTab = tab.dataset.authTab;
                for (const candidate of scope.querySelectorAll("[data-auth-tab]")) {
                    const active = candidate === tab;
                    candidate.classList.toggle("is-active", active);
                    candidate.setAttribute("aria-selected", String(active));
                }
                for (const panel of scope.querySelectorAll("[data-auth-panel]")) {
                    panel.hidden = panel.dataset.authPanel !== selectedTab;
                }
                setMessage(scope, "");
            });
        }

        for (const form of scope.querySelectorAll("[data-auth-panel]")) {
            form.addEventListener("submit", async (event) => {
                event.preventDefault();
                const submit = form.querySelector(".auth-submit");
                submit.disabled = true;
                setMessage(scope, "Проверяем данные...");
                try {
                    const csrf = form.querySelector("[name=csrfmiddlewaretoken]")?.value
                        || document.querySelector("[name=csrfmiddlewaretoken]")?.value || "";
                    const response = await fetch(form.action, {
                        method: "POST",
                        body: new URLSearchParams(new FormData(form)),
                        headers: { "X-CSRFToken": csrf, "X-Requested-With": "XMLHttpRequest" },
                    });
                    const result = await response.json();
                    if (!response.ok || !result.success) {
                        const errors = result.errors || ["Не удалось выполнить запрос."];
                        const errorList = Array.isArray(errors) ? errors : Object.values(errors).flat();
                        throw new Error(errorList.join(" "));
                    }

                    if (scope === dialogScope) {
                        dialog.close();
                        if (checkoutPending) {
                            window.location.assign("/checkout/");
                            return;
                        }
                    }
                    window.location.reload();
                } catch (error) {
                    setMessage(scope, error.message);
                } finally {
                    submit.disabled = false;
                }
            });
        }
    }

    for (const button of document.querySelectorAll("[data-open-auth]")) {
        button.addEventListener("click", () => window.openAuthDialog());
    }

    if (new URLSearchParams(window.location.search).get("auth") === "required") {
        window.openAuthDialog("Войдите или зарегистрируйтесь, чтобы сохранить ваш ПК", true);
    }
})();
