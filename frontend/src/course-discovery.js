(() => {
  const normalize = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");

  const getRoute = (name) => {
    const pathname = String(window.location.pathname || "").toLowerCase();
    const prefersExtensionless = Boolean(pathname) && pathname !== "/" && !pathname.endsWith(".html");
    return prefersExtensionless ? `./${name}` : `./${name}.html`;
  };

  const COURSE_ROUTES = [
    {
      value: "tuition-start",
      label: "AI Tuition Teacher",
      href: () => getRoute("tuition-start"),
      keywords: ["ai tuition teacher", "tuition teacher", "tuition start", "school ai teacher"],
    },
    {
      value: "smart-tuitions",
      label: "CC Academy Smart Tuitions",
      href: () => getRoute("smart-tuitions"),
      keywords: [
        "smart tuitions",
        "smart tuition",
        "tuition",
        "tuitions",
        "online classes",
        "cbse",
        "icse",
        "pseb",
        "class 6",
        "class 7",
        "class 8",
        "class 9",
        "class 10",
        "class 11",
        "class 12",
        "6 to 12",
        "6-12",
      ],
    },
    {
      value: "products",
      label: "Study Materials",
      href: () => getRoute("products"),
      keywords: ["products", "study materials", "books", "ebooks", "course materials"],
    },
    {
      value: "mock-tests",
      label: "Mock Tests",
      href: () => getRoute("mock-tests"),
      keywords: ["mock tests", "test series", "practice tests", "mocks"],
    },
    {
      value: "pstet-1",
      label: "PSTET-1 Complete Batch",
      href: () => `${getRoute("products")}?search=${encodeURIComponent("PSTET-1 Complete Batch")}`,
      keywords: ["pstet 1", "pstet-1", "paper 1 batch", "primary batch"],
    },
    {
      value: "pstet-2-science",
      label: "PSTET-2 Science/Math",
      href: () => `${getRoute("products")}?search=${encodeURIComponent("PSTET-2 Science Math")}`,
      keywords: ["pstet 2 science", "pstet-2 science", "science math", "science batch"],
    },
    {
      value: "pstet-2-social",
      label: "PSTET-2 Social Studies",
      href: () => `${getRoute("products")}?search=${encodeURIComponent("PSTET-2 Social Studies")}`,
      keywords: ["pstet 2 social", "pstet-2 social", "social studies", "sst batch"],
    },
    {
      value: "spoken-english",
      label: "Spoken English",
      href: () => `${getRoute("products")}?search=${encodeURIComponent("Spoken English")}`,
      keywords: ["spoken english", "english speaking", "english course"],
    },
    {
      value: "personality-development",
      label: "Personality Development",
      href: () => `${getRoute("products")}?search=${encodeURIComponent("Personality Development")}`,
      keywords: ["personality development", "soft skills", "communication skills"],
    },
  ];

  const SELECT_IDS = [
    "#headerCourseSelect",
    "#headerCourseSelectMobile",
    "#headerCourseSelectCheckout",
  ];
  const SEARCH_IDS = [
    "#headerCourseSearch",
    "#headerCourseSearchMobile",
    "#headerCourseSearchCheckout",
  ];

  const isProductsPage = () => {
    const pathname = String(window.location.pathname || "").toLowerCase();
    return pathname.endsWith("/products") || pathname.endsWith("/products.html");
  };

  const ensureCourseOption = (select, course) => {
    if (!(select instanceof HTMLSelectElement)) return;
    const exists = Array.from(select.options).some(
      (option) => String(option.value || "").trim().toLowerCase() === course.value
    );
    if (exists) return;
    const option = document.createElement("option");
    option.value = course.value;
    option.textContent = course.label;
    select.appendChild(option);
  };

  const findCourseByValue = (value) => {
    const normalizedValue = normalize(value);
    if (!normalizedValue) return null;
    return COURSE_ROUTES.find((course) => normalize(course.value) === normalizedValue) || null;
  };

  const findCourseByQuery = (query) => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return null;

    let bestCourse = null;
    let bestScore = 0;

    COURSE_ROUTES.forEach((course) => {
      const terms = [course.label, course.value, ...(course.keywords || [])]
        .map((entry) => normalize(entry))
        .filter(Boolean);

      terms.forEach((term) => {
        let score = 0;
        if (term === normalizedQuery) score = 1000 + term.length;
        else if (normalizedQuery.includes(term)) score = 700 + term.length;
        else if (term.includes(normalizedQuery) && normalizedQuery.length >= 3) score = 500 + normalizedQuery.length;

        if (score > bestScore) {
          bestScore = score;
          bestCourse = course;
        }
      });
    });

    return bestCourse;
  };

  const navigateTo = (hrefFactory) => {
    const href = typeof hrefFactory === "function" ? hrefFactory() : String(hrefFactory || "").trim();
    if (!href) return;
    window.location.href = href;
  };

  const navigateToSearchResults = (query) => {
    const normalizedQuery = String(query || "").trim();
    if (!normalizedQuery) return;
    if (isProductsPage()) return;
    const href = `${getRoute("products")}?search=${encodeURIComponent(normalizedQuery)}`;
    window.location.href = href;
  };

  const attachDatalist = (inputs) => {
    if (!inputs.length) return;
    let dataList = document.querySelector("#courseSearchSuggestions");
    if (!(dataList instanceof HTMLDataListElement)) {
      dataList = document.createElement("datalist");
      dataList.id = "courseSearchSuggestions";
      COURSE_ROUTES.forEach((course) => {
        const option = document.createElement("option");
        option.value = course.label;
        dataList.appendChild(option);
      });
      document.body.appendChild(dataList);
    }

    inputs.forEach((input) => {
      if (!(input instanceof HTMLInputElement)) return;
      input.setAttribute("list", "courseSearchSuggestions");
    });
  };

  const submitSearch = (input) => {
    const rawQuery = String(input?.value || "").trim();
    if (!rawQuery) return;
    const matchedCourse = findCourseByQuery(rawQuery);
    if (matchedCourse) {
      navigateTo(matchedCourse.href);
      return;
    }
    navigateToSearchResults(rawQuery);
  };

  document.addEventListener("DOMContentLoaded", () => {
    const selects = SELECT_IDS.map((selector) => document.querySelector(selector)).filter(Boolean);
    COURSE_ROUTES.forEach((course) => {
      selects.forEach((select) => ensureCourseOption(select, course));
    });

    selects.forEach((select) => {
      if (!(select instanceof HTMLSelectElement)) return;
      select.addEventListener("change", () => {
        const matchedCourse = findCourseByValue(select.value);
        if (!matchedCourse) return;
        navigateTo(matchedCourse.href);
      });
    });

    const inputs = SEARCH_IDS.map((selector) => document.querySelector(selector)).filter(Boolean);
    attachDatalist(inputs);

    const forms = new Set();
    inputs.forEach((input) => {
      if (!(input instanceof HTMLInputElement)) return;
      const parentForm = input.closest("form");
      if (parentForm && !forms.has(parentForm)) {
        forms.add(parentForm);
        parentForm.addEventListener("submit", (event) => {
          event.preventDefault();
          const activeInput = parentForm.querySelector("input[type='search']");
          submitSearch(activeInput);
        });
      }

      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        submitSearch(input);
      });
    });
  });
})();
