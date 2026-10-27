window.activitySharing = (() => {
  let lastFocusedHash = "";

  function activityId(name) {
    return `activity-${encodeURIComponent(name)}`;
  }

  function createControls(name, description, schedule) {
    const url = new URL("index.html", window.location.href);
    url.search = "";
    url.hash = new URLSearchParams({ activity: name }).toString();
    const shareUrl = url.href;
    const title = `${name} - Mergington High School`;
    const text = `${name}: ${description}\nSchedule: ${schedule}`;
    const controls = document.createElement("div");
    controls.className = "activity-sharing";
    controls.setAttribute("role", "group");
    controls.setAttribute("aria-label", `Share ${name}`);

    const label = document.createElement("span");
    label.textContent = "Share:";
    controls.appendChild(label);

    const status = document.createElement("p");
    status.className = "share-status";
    status.setAttribute("role", "status");

    if (typeof navigator.share === "function") {
      const shareButton = document.createElement("button");
      shareButton.type = "button";
      shareButton.textContent = "Share...";
      shareButton.addEventListener("click", async () => {
        status.textContent = "";
        try {
          await navigator.share({ title, text, url: shareUrl });
        } catch (error) {
          if (error.name !== "AbortError") {
            console.error("Could not share activity:", error);
            status.textContent = "Could not open sharing. Try a sharing link or Copy link.";
          }
        }
      });
      controls.appendChild(shareButton);
    }

    const destinations = [
      ["WhatsApp", `https://wa.me/?${new URLSearchParams({ text: `${text}\n${shareUrl}` })}`],
      ["Facebook", `https://www.facebook.com/sharer/sharer.php?${new URLSearchParams({ u: shareUrl })}`],
    ];

    destinations.forEach(([label, href]) => {
      const link = document.createElement("a");
      link.textContent = label;
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", `Share ${name} on ${label} (opens in a new tab)`);
      controls.appendChild(link);
    });

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.textContent = "Copy link";
    const manualLink = document.createElement("input");
    manualLink.type = "text";
    manualLink.readOnly = true;
    manualLink.value = shareUrl;
    manualLink.className = "share-link hidden";
    manualLink.setAttribute("aria-label", `Link to ${name}`);

    copyButton.addEventListener("click", async () => {
      status.textContent = "";
      try {
        if (!navigator.clipboard || !navigator.clipboard.writeText) {
          manualLink.classList.remove("hidden");
          manualLink.focus();
          manualLink.select();
          status.textContent = "Select and copy the link below to share this activity.";
          return;
        }
        await navigator.clipboard.writeText(shareUrl);
        status.textContent = "Link copied!";
        manualLink.classList.add("hidden");
      } catch (error) {
        console.error("Could not copy activity link:", error);
        manualLink.classList.remove("hidden");
        manualLink.focus();
        manualLink.select();
        status.textContent = "Could not copy automatically. Select and copy the link below.";
      }
    });

    controls.append(copyButton, status, manualLink);
    return controls;
  }

  function focusSharedActivity() {
    const hash = window.location.hash;
    if (!hash || hash === lastFocusedHash) {
      return;
    }
    const name = new URLSearchParams(hash.slice(1)).get("activity");
    if (!name) {
      return;
    }
    const card = document.getElementById(activityId(name));
    if (card) {
      card.scrollIntoView({ block: "center" });
      card.focus({ preventScroll: true });
      lastFocusedHash = hash;
    }
  }

  window.addEventListener("hashchange", () => {
    lastFocusedHash = "";
    focusSharedActivity();
  });

  return { activityId, createControls, focusSharedActivity };
})();
