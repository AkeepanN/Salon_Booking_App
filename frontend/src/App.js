import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

function resolveApiBaseUrl() {
  const envUrl = (process.env.REACT_APP_API_URL || "").trim().replace(/\/+$/, "");
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";

  if (isLocalHost) {
    return envUrl && !/railway\.app/i.test(envUrl) ? envUrl : "http://localhost:5000";
  }

  if (envUrl && !/localhost|127\.0\.0\.1/i.test(envUrl)) {
    return envUrl;
  }

  return "https://salonbookingapp-env.up.railway.app";
}

const API_BASE_URL = resolveApiBaseUrl();
const API_BASE = `${API_BASE_URL}/api`;
const API_ORIGIN = API_BASE_URL;
console.log("Final API base URL:", API_BASE_URL);
const now = new Date();
const today = now.toISOString().slice(0, 10);
const currentMonth = now.getMonth() + 1;
const currentYear = now.getFullYear();
const DEFAULT_IMAGE_POSITION = { x: 50, y: 50, zoom: 1 };

function imageUrl(path) {
  if (!path) {
    return "";
  }

  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }

  return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

function parseStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch (error) {
    return {};
  }
}

function bookingSortValue(booking) {
  return new Date(`${booking.date}T${booking.start_time || "00:00"}:00`).getTime();
}

function sortBookingsForTab(bookings, tab) {
  return [...bookings].sort((a, b) => {
    if (tab === "cancelled") {
      return new Date(b.cancelled_at || 0) - new Date(a.cancelled_at || 0);
    }

    if (tab === "completed") {
      const bTime = b.completed_at ? new Date(b.completed_at).getTime() : bookingSortValue(b);
      const aTime = a.completed_at ? new Date(a.completed_at).getTime() : bookingSortValue(a);
      return bTime - aTime;
    }

    return bookingSortValue(a) - bookingSortValue(b);
  });
}

function roleLabel(role) {
  if (!role) {
    return "Unknown";
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}

function professionalTypeLabel(type) {
  if (type === "beautician") {
    return "Beautician";
  }

  if (type === "makeup_artist") {
    return "Makeup Artist";
  }

  return "Barber";
}

function providerServicesLabel(type) {
  if (type === "beautician") {
    return "Beauty Services";
  }

  if (type === "makeup_artist") {
    return "Makeup Services";
  }

  return "Hair Services";
}

function providerIconName(type) {
  if (type === "beautician") {
    return "beautician";
  }

  if (type === "makeup_artist") {
    return "makeup_artist";
  }

  return "barber";
}

function providerTheme(type) {
  if (type === "beautician") {
    return {
      hero: {
        backgroundImage: "linear-gradient(90deg, rgba(99, 35, 89, 0.88), rgba(244, 114, 182, 0.18)), url('/assets/barber-hero-photo.png')"
      },
      avatarButton: {
        borderColor: "#be185d",
        background: "#fff1f6",
        color: "#be185d"
      },
      badge: {
        background: "#fff1f6",
        color: "#be185d"
      },
      activeTab: {
        borderColor: "#be185d",
        background: "#fff1f6",
        color: "#be185d"
      }
    };
  }

  if (type === "makeup_artist") {
    return {
      hero: {
        backgroundImage: "linear-gradient(90deg, rgba(55, 35, 99, 0.88), rgba(129, 140, 248, 0.22)), url('/assets/barber-hero-photo.png')"
      },
      avatarButton: {
        borderColor: "#6d28d9",
        background: "#f5f3ff",
        color: "#6d28d9"
      },
      badge: {
        background: "#f5f3ff",
        color: "#6d28d9"
      },
      activeTab: {
        borderColor: "#6d28d9",
        background: "#f5f3ff",
        color: "#6d28d9"
      }
    };
  }

  return {
    hero: {},
    avatarButton: {},
    badge: {},
    activeTab: {}
  };
}

function serviceCategoryLabel(category) {
  if (category === "beauty") {
    return "Beauty";
  }

  if (category === "makeup") {
    return "Makeup";
  }

  return "Hair";
}

function productCategoryLabel(category) {
  const value = String(category || "").trim().toLowerCase();

  if (value === "beauty") {
    return "Beauty";
  }

  if (value === "makeup") {
    return "Makeup";
  }

  return "Hair";
}

function productCategoryStyle(category) {
  const value = String(category || "").trim().toLowerCase();

  if (value === "beauty") {
    return styles.productBadgeBeauty;
  }

  if (value === "makeup") {
    return styles.productBadgeMakeup;
  }

  return styles.productBadgeHair;
}

function isProductUnavailable(product) {
  return Number(product?.stock_quantity || 0) <= 0 || product?.active === false;
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

function ratingText(salon) {
  const average = Number(salon?.average_rating || 0);
  const count = Number(salon?.rating_count || 0);
  return count ? `${average.toFixed(1)} (${count} reviews)` : "No ratings yet";
}

function renderStars(rating) {
  const value = Number(rating || 0);
  if (!value) {
    return "No ratings yet";
  }

  const fullStars = Math.max(0, Math.min(5, Math.round(value)));
  return `${"★".repeat(fullStars)}${"☆".repeat(5 - fullStars)}`;
}

function formatDistance(distance) {
  if (distance == null || Number.isNaN(Number(distance))) {
    return "";
  }

  return `${Number(distance).toFixed(1)} km away`;
}

function normalizeImagePosition(input) {
  return {
    x: Math.max(0, Math.min(100, Number(input?.x ?? DEFAULT_IMAGE_POSITION.x))),
    y: Math.max(0, Math.min(100, Number(input?.y ?? DEFAULT_IMAGE_POSITION.y))),
    zoom: Math.max(1, Math.min(3, Number(input?.zoom ?? DEFAULT_IMAGE_POSITION.zoom))),
  };
}

function getPositionedImageStyle(baseStyle, imagePosition) {
  const position = normalizeImagePosition(imagePosition);
  return {
    ...baseStyle,
    objectFit: "cover",
    objectPosition: `${position.x}% ${position.y}%`,
    transform: `scale(${position.zoom})`,
    transformOrigin: `${position.x}% ${position.y}%`,
  };
}

function DetailsModal({ open, title, onClose, children, wide = false }) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="details-modal-backdrop"
      style={styles.modalBackdrop}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="details-modal"
        style={{ ...styles.modalCard, ...(wide ? styles.wideModalCard : {}) }}
      >
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>{title}</h2>
          <button
            type="button"
            className="details-modal-close"
            onClick={onClose}
            style={styles.smallButton}
          >
            Close
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function ImagePositionEditor({
  imageSrc,
  position,
  onChange,
  emptyLabel,
}) {
  const frameRef = useRef(null);
  const dragRef = useRef(null);
  const normalized = normalizeImagePosition(position);

  const startDrag = (clientX, clientY) => {
    dragRef.current = {
      clientX,
      clientY,
      x: normalized.x,
      y: normalized.y,
    };
  };

  const moveDrag = (clientX, clientY) => {
    if (!dragRef.current || !frameRef.current) {
      return;
    }

    const rect = frameRef.current.getBoundingClientRect();
    const deltaX = ((clientX - dragRef.current.clientX) / rect.width) * 100;
    const deltaY = ((clientY - dragRef.current.clientY) / rect.height) * 100;

    onChange({
      ...normalized,
      x: Math.max(0, Math.min(100, dragRef.current.x + deltaX)),
      y: Math.max(0, Math.min(100, dragRef.current.y + deltaY)),
    });
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  return (
    <div className="image-position-editor" style={styles.imagePositionEditor}>
      <div
        ref={frameRef}
        className="image-editor-frame"
        style={styles.imageEditorFrame}
        onMouseDown={(event) => {
          if (!imageSrc) {
            return;
          }
          event.preventDefault();
          startDrag(event.clientX, event.clientY);
        }}
        onMouseMove={(event) => moveDrag(event.clientX, event.clientY)}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onTouchStart={(event) => {
          if (!imageSrc) {
            return;
          }
          const touch = event.touches[0];
          if (!touch) {
            return;
          }
          startDrag(touch.clientX, touch.clientY);
        }}
        onTouchMove={(event) => {
          const touch = event.touches[0];
          if (!touch) {
            return;
          }
          moveDrag(touch.clientX, touch.clientY);
        }}
        onTouchEnd={endDrag}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt=""
            className="image-editor-img"
            draggable={false}
            style={getPositionedImageStyle(styles.imageEditorImg, normalized)}
          />
        ) : (
          <div style={styles.boardPhotoPlaceholder}>{emptyLabel}</div>
        )}
      </div>
      <div className="position-controls" style={styles.positionControls}>
        <label style={{ ...styles.label, margin: 0 }}>
          Zoom
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={normalized.zoom}
            onChange={(event) => onChange({ ...normalized, zoom: Number(event.target.value) })}
            style={styles.rangeInput}
          />
        </label>
        <button
          type="button"
          onClick={() => onChange(DEFAULT_IMAGE_POSITION)}
          style={styles.smallButton}
        >
          Reset view
        </button>
      </div>
    </div>
  );
}

const monthOptions = [
  ["1", "January"],
  ["2", "February"],
  ["3", "March"],
  ["4", "April"],
  ["5", "May"],
  ["6", "June"],
  ["7", "July"],
  ["8", "August"],
  ["9", "September"],
  ["10", "October"],
  ["11", "November"],
  ["12", "December"],
];

function StatusBadge({ status }) {
  const style = {
    ...styles.statusBadge,
    ...(status === "confirmed" ? styles.badgeConfirmed : {}),
    ...(status === "cancelled" ? styles.badgeCancelled : {}),
    ...(status === "completed" ? styles.badgeCompleted : {}),
    ...(status === "paid" ? styles.badgePaid : {}),
  };

  return <span style={style}>{status || "unpaid"}</span>;
}

function Icon({ name }) {
  const paths = {
    booking: "M7 3v3M17 3v3M4 8h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm4 8 2 2 4-5",
    bookings: "M7 6h10M7 12h10M7 18h6M4 5h.01M4 11h.01M4 17h.01",
    barber: "M6 4l12 16M18 4 6 20M8.5 7.5l7 0M8.5 16.5h7",
    beautician: "M12 3l1.2 3.3L16.5 7.5l-3.3 1.2L12 12l-1.2-3.3L7.5 7.5l3.3-1.2L12 3Zm6 10 1 2.4L21 16l-2 1.1L18 19.5 17 17.1 15 16l2-.6L18 13Zm-12 0 1 2.4L9 16l-2 1.1L6 19.5 5 17.1 3 16l2-.6L6 13Z",
    makeup_artist: "M14 4c3 0 5 2 5 5 0 2-1.2 3.8-3 4.6V20l-2-1-2 1v-6.4A5 5 0 0 1 9 9c0-3 2-5 5-5Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM5 20c1.7 0 3-1.3 3-3v-1H6a3 3 0 0 0-3 3v1h2Z",
    admin: "M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4Zm-3 9 2 2 4-4",
    salons: "M4 20h16M6 20V9l6-5 6 5v11M9 20v-6h6v6",
    services: "M7 7h10M7 12h10M7 17h7M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z",
    payments: "M4 7h16v10H4V7Zm0 3h16M7 15h3",
    users: "M16 11a4 4 0 1 0-8 0M4 21a8 8 0 0 1 16 0M19 8h3M20.5 6.5v3",
    settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1",
    ratings: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2 7.5 14 3 9.6l6.2-.9L12 3Z",
    notifications: "M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5M9 17a3 3 0 0 0 6 0",
    earnings: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6",
    logout: "M10 17l5-5-5-5M15 12H3M21 4v16",
    deactivate: "M12 9v4M12 17h.01M10.3 4.3 2.9-1.7 8 14A2 2 0 0 1 19.5 20h-15a2 2 0 0 1-1.7-3.1l7.5-12.6Z",
    products: "M7 4h10l2 4v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8l2-4Zm2 4V6h6v2",
    shop: "M6 6h15l-1.5 8.5a2 2 0 0 1-2 1.5H9a2 2 0 0 1-2-1.6L5.4 4H3M9 20a1 1 0 1 0 0 .01M18 20a1 1 0 1 0 0 .01",
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: "0 0 auto" }}
    >
      <path d={paths[name] || paths.booking} />
    </svg>
  );
}

function Brand() {
  return (
    <span style={styles.brand}>
      <img src="/app-logo.svg" alt="" style={styles.brandLogo} />
      Salon Booking
    </span>
  );
}

function InstallButton({ onInstall, visible }) {
  if (!visible) {
    return null;
  }

  return (
    <button type="button" onClick={onInstall} style={styles.installButton}>
      Install App
    </button>
  );
}

function PolicyFooter() {
  return (
    <footer style={styles.policyFooter}>
      <div style={styles.policyFooterLinks}>
        <a href="/return-policy" style={styles.footerLink}>Return / Refund Policy</a>
        <a href="/privacy-policy" style={styles.footerLink}>Privacy Policy</a>
      </div>
      <div style={styles.policyBusiness}>
        <strong>Agnitech Solutions (Pvt) Ltd</strong>
        <img src="/assets/agnitech-logo.jpg" alt="Agnitech Solutions logo" style={styles.policyLogo} />
      </div>
    </footer>
  );
}

function PolicyPage({ type }) {
  const isReturnPolicy = type === "return";

  return (
    <main style={styles.page}>
      <nav style={styles.navbar}>
        <a href="/" style={styles.brandLink}><Brand /></a>
      </nav>

      <section style={styles.policyCard}>
        <h1 style={styles.title}>{isReturnPolicy ? "Return and Refund Policy" : "Privacy Policy"}</h1>

        {isReturnPolicy ? (
          <div style={styles.policyContent}>
            <p>At Agnitech Solutions Pvt LTD, we provide online salon booking services through our platform.</p>
            <p>Customers are required to pay a booking fee or advance payment to confirm appointments. In case of cancellation, the refund or cancellation charge will be applied based on the cancellation policy set at the time of booking.</p>
            <p>If the cancellation is eligible for a refund, the refundable amount will be processed through the original payment method where possible.</p>
            <p>No refund will be provided for completed services.</p>
            <p>Agnitech Solutions Pvt LTD is not responsible for service quality issues once the service is completed, as services are provided by independent salons.</p>
            <p>For any refund or cancellation-related inquiries, please contact us at:</p>
          </div>
        ) : (
          <div style={styles.policyContent}>
            <p>At Agnitech Solutions Pvt LTD, we value your privacy and are committed to protecting your personal information.</p>
            <p>We may collect personal details such as name, phone number, booking information, and payment status to provide and improve our salon booking services.</p>
            <p>We do not sell or share personal information with third parties, except when necessary for:</p>
            <ul style={styles.policyList}>
              <li>Payment processing</li>
              <li>Service delivery</li>
              <li>Legal compliance</li>
              <li>System security</li>
            </ul>
            <p>Payments are processed through secure third-party payment gateways. We do not store sensitive payment details such as card numbers.</p>
            <p>Users have the right to request access, correction, or deletion of their personal data by contacting us.</p>
            <p>Contact details:</p>
          </div>
        )}

        <div style={styles.contactBox}>
          <strong>Agnitech Solutions Pvt LTD</strong>
          <span>Email: agnitechsolutions06@gmail.com</span>
          <span>Phone: +94 71 179 5314</span>
        </div>
      </section>

      <PolicyFooter />
    </main>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [role, setRole] = useState(localStorage.getItem("role") || "");
  const [currentUser, setCurrentUser] = useState(parseStoredUser);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    role: "customer",
    professional_type: "barber"
  });
  const [signupProfilePhoto, setSignupProfilePhoto] = useState(null);
  const [signupProfilePreview, setSignupProfilePreview] = useState("");
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    profilePhotoUrl: ""
  });
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState("");
  const [profileNotice, setProfileNotice] = useState(null);
  const [salons, setSalons] = useState([]);
  const [salonSort, setSalonSort] = useState("top_rated");
  const [services, setServices] = useState([]);
  const [slots, setSlots] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedSalon, setSelectedSalon] = useState(null);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancelBookingMessage, setCancelBookingMessage] = useState("");
  const [paymentNotice, setPaymentNotice] = useState("");
  const [workingHoursMessage, setWorkingHoursMessage] = useState("");
  const [barberSalons, setBarberSalons] = useState([]);
  const [selectedBarberSalonId, setSelectedBarberSalonId] = useState("");
  const [barberServices, setBarberServices] = useState([]);
  const [barberBookings, setBarberBookings] = useState([]);
  const [barberAllBookings, setBarberAllBookings] = useState([]);
  const [barberInsights, setBarberInsights] = useState(null);
  const [barberEarnings, setBarberEarnings] = useState(null);
  const [barberEarningsFilters, setBarberEarningsFilters] = useState({
    view: "monthly",
    month: String(currentMonth),
    year: String(currentYear)
  });
  const [barberEarningsOpen, setBarberEarningsOpen] = useState(false);
  const [barberMainTab, setBarberMainTab] = useState("dashboard");
  const [barberBookingTab, setBarberBookingTab] = useState("confirmed");
  const [barberMenuOpen, setBarberMenuOpen] = useState(false);
  const [barberModal, setBarberModal] = useState("");
  const [reservedSlots, setReservedSlots] = useState([]);
  const [barberNotice, setBarberNotice] = useState(null);
  const [barberConfirm, setBarberConfirm] = useState(null);
  const [salonForm, setSalonForm] = useState({ name: "", address: "", phone: "", latitude: "", longitude: "" });
  const [boardPhotoFile, setBoardPhotoFile] = useState(null);
  const [boardPhotoPreview, setBoardPhotoPreview] = useState("");
  const [boardPhotoPosition, setBoardPhotoPosition] = useState(DEFAULT_IMAGE_POSITION);
  const [boardPhotoMessage, setBoardPhotoMessage] = useState("");
  const [serviceForm, setServiceForm] = useState({ name: "", service_category: "hair", price: "", duration: "30" });
  const [productForm, setProductForm] = useState({
    name: "",
    brand: "",
    description: "",
    price: "",
    stock_quantity: "",
    category: "",
    salon_id: "",
    active: true
  });
  const [productImageFile, setProductImageFile] = useState(null);
  const [productImagePreview, setProductImagePreview] = useState("");
  const [productImagePosition, setProductImagePosition] = useState(DEFAULT_IMAGE_POSITION);
  const [editingProductId, setEditingProductId] = useState("");
  const [barberProducts, setBarberProducts] = useState([]);
  const [barberProductOrders, setBarberProductOrders] = useState([]);
  const [barberProductMessage, setBarberProductMessage] = useState("");
  const [reserveForm, setReserveForm] = useState({
    date: today,
    start_time: "12:00",
    end_time: "12:30",
    reason: ""
  });
  const [reserveMessage, setReserveMessage] = useState("");
  const [copyFromSalonId, setCopyFromSalonId] = useState("");
  const [customerTab, setCustomerTab] = useState("book");
  const [customerBookings, setCustomerBookings] = useState([]);
  const [customerBookingTab, setCustomerBookingTab] = useState("confirmed");
  const [customerProducts, setCustomerProducts] = useState([]);
  const [customerProductOrders, setCustomerProductOrders] = useState([]);
  const [productOrderQuantities, setProductOrderQuantities] = useState({});
  const [productSearch, setProductSearch] = useState("");
  const [productBrandFilter, setProductBrandFilter] = useState("");
  const [productSalonFilter, setProductSalonFilter] = useState("");
  const [productListingMode, setProductListingMode] = useState("salon");
  const [productSort, setProductSort] = useState("distance");
  const [customerProductLocation, setCustomerProductLocation] = useState(null);
  const [shopMessage, setShopMessage] = useState("");
  const [customerMenuOpen, setCustomerMenuOpen] = useState(false);
  const [customerServiceTypeFilter, setCustomerServiceTypeFilter] = useState("all");
  const [salonDetailsOpen, setSalonDetailsOpen] = useState(false);
  const [selectedCosmetic, setSelectedCosmetic] = useState(null);
  const [ratingModalBooking, setRatingModalBooking] = useState(null);
  const [ratingForm, setRatingForm] = useState({ rating: 5, comment: "" });
  const [ratingMessage, setRatingMessage] = useState("");
  const [workingHoursForm, setWorkingHoursForm] = useState({
    open: "09:00",
    close: "18:00",
    slotIntervalMinutes: 15,
    workingDays: [1, 2, 3, 4, 5, 6]
  });
  const [adminTab, setAdminTab] = useState("users");
  const [adminUserTab, setAdminUserTab] = useState("active");
  const [adminSalonTab, setAdminSalonTab] = useState("active");
  const [adminBookingTab, setAdminBookingTab] = useState("confirmed");
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminSalons, setAdminSalons] = useState([]);
  const [adminBookings, setAdminBookings] = useState([]);
  const [adminProducts, setAdminProducts] = useState([]);
  const [adminProductOrders, setAdminProductOrders] = useState([]);
  const [adminFilters, setAdminFilters] = useState({ date: "", salon_id: "", status: "confirmed" });
  const [adminSummaryRange, setAdminSummaryRange] = useState("this_month");
  const [adminBusinessSummary, setAdminBusinessSummary] = useState(null);
  const [adminEarnings, setAdminEarnings] = useState(null);
  const [adminEarningsFilters, setAdminEarningsFilters] = useState({
    view: "monthly",
    month: String(currentMonth),
    year: String(currentYear)
  });
  const [adminConfirm, setAdminConfirm] = useState(null);
  const [adminSalonConfirm, setAdminSalonConfirm] = useState(null);
  const [adminClearConfirm, setAdminClearConfirm] = useState(null);
  const [adminClearText, setAdminClearText] = useState("");
  const [bookingFeeForm, setBookingFeeForm] = useState("0");
  const [cancellationChargeForm, setCancellationChargeForm] = useState("0");
  const [commissionForm, setCommissionForm] = useState("0");
  const [bookingFeeExample, setBookingFeeExample] = useState(null);
  const [paymentRules, setPaymentRules] = useState({
    booking_fee_percentage: 0,
    cancellation_charge_percentage: 0,
    commission_percentage: 0
  });
  const [adminMessage, setAdminMessage] = useState("");
  const [editingServiceId, setEditingServiceId] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [editServiceForm, setEditServiceForm] = useState({
    name: "",
    description: "",
    service_category: "hair",
    price: "",
    duration: "30",
    active: true
  });

  const isLoggedIn = Boolean(token);
  const providerType = currentUser?.professional_type || "barber";
  const providerLabel = professionalTypeLabel(providerType);
  const providerServicesTitle = providerServicesLabel(providerType);
  const providerIcon = providerIconName(providerType);
  const providerThemeStyles = providerTheme(providerType);
  const selectedBarberSalon = useMemo(
    () => barberSalons.find((salon) => salon._id === selectedBarberSalonId),
    [barberSalons, selectedBarberSalonId]
  );
  const boardPhotoSource = boardPhotoPreview || imageUrl(selectedBarberSalon?.board_photo_url);
  const productPreviewSource = productImagePreview || imageUrl(
    barberProducts.find((product) => product._id === editingProductId)?.image
  );
  const barberInitials = useMemo(() => {
    const name = currentUser?.name || "Service Provider";
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "B";
  }, [currentUser]);
  const scopedBarberBookings = useMemo(() => {
    const bookings = selectedBarberSalonId
      ? barberAllBookings.filter((booking) => (booking.salon_id?._id || booking.salon_id) === selectedBarberSalonId)
      : barberAllBookings;

    return [...bookings].sort((a, b) => bookingSortValue(a) - bookingSortValue(b));
  }, [barberAllBookings, selectedBarberSalonId]);
  const bookingTabs = useMemo(() => ({
    confirmed: sortBookingsForTab(scopedBarberBookings.filter((booking) => booking.status === "confirmed"), "confirmed"),
    cancelled: sortBookingsForTab(scopedBarberBookings.filter((booking) => booking.status === "cancelled"), "cancelled"),
    completed: sortBookingsForTab(scopedBarberBookings.filter((booking) => booking.status === "completed"), "completed")
  }), [scopedBarberBookings]);
  const todayBarberBookings = useMemo(
    () => scopedBarberBookings.filter((booking) => booking.date === today && booking.status !== "cancelled"),
    [scopedBarberBookings]
  );
  const customerInitials = useMemo(() => {
    const name = currentUser?.name || "Customer";
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "C";
  }, [currentUser]);
  const renderProfileEditor = (titlePrefix = "Profile") => (
    <form onSubmit={saveProfile} style={styles.uploadBox}>
      <div style={styles.profileHeader}>
        {profilePhotoPreview ? (
          <img src={profilePhotoPreview} alt="Profile" style={styles.profilePhotoPreview} />
        ) : (
          <div style={styles.profilePhotoPlaceholder}>Profile photo</div>
        )}
        <div style={styles.profileHeaderText}>
          <strong>{titlePrefix}</strong>
          <span>{currentUser?.name || "User"}</span>
          <span>{currentUser?.role === "barber" ? `Service Provider (${providerLabel})` : currentUser?.role || "User"}</span>
        </div>
      </div>
      {profileNotice && (
        <div style={profileNotice.type === "success" ? styles.successCard : styles.errorCard}>
          {profileNotice.text}
        </div>
      )}
      <label style={styles.label}>Name</label>
      <input
        value={profileForm.name}
        onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))}
        style={styles.input}
      />
      <label style={styles.label}>Mobile number</label>
      <input
        type="tel"
        value={profileForm.phone}
        onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))}
        style={styles.input}
      />
      <label style={styles.label}>Email</label>
      <input
        type="email"
        value={profileForm.email}
        onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))}
        style={styles.input}
      />
      <label style={styles.label}>Address / location</label>
      <input
        value={profileForm.address}
        onChange={(event) => setProfileForm((current) => ({ ...current, address: event.target.value }))}
        style={styles.input}
      />
      <label style={styles.label}>Profile photo</label>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleProfilePhotoChange}
        style={styles.input}
      />
      <button type="submit" disabled={loading} style={styles.primaryButton}>
        {loading ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
  const customerBookingTabs = useMemo(() => {
    return {
      confirmed: sortBookingsForTab(customerBookings.filter((booking) => booking.status === "confirmed"), "confirmed"),
      cancelled: sortBookingsForTab(customerBookings.filter((booking) => booking.status === "cancelled"), "cancelled"),
      completed: sortBookingsForTab(customerBookings.filter((booking) => booking.status === "completed"), "completed")
    };
  }, [customerBookings]);
  const shopSalonOptions = useMemo(() => {
    const byId = new Map();
    salons.forEach((salon) => {
      if (salon?._id) {
        byId.set(salon._id, salon);
      }
    });
    customerProducts.forEach((product) => {
      const salon = product.salon_id;
      if (salon?._id && !byId.has(salon._id)) {
        byId.set(salon._id, salon);
      }
    });

    return [...byId.values()].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [salons, customerProducts]);
  const productBrandOptions = useMemo(
    () => [...new Set(customerProducts.map((product) => product.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [customerProducts]
  );
  const filteredCustomerProducts = useMemo(() => {
    let items = [...customerProducts];

    if (productBrandFilter) {
      items = items.filter((product) => product.brand === productBrandFilter);
    }

    if (productSort === "price_low") {
      items.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (productSort === "price_high") {
      items.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else if (productSort === "distance") {
      items.sort((a, b) => {
        const aDistance = a.distance_km == null ? Number.POSITIVE_INFINITY : Number(a.distance_km);
        const bDistance = b.distance_km == null ? Number.POSITIVE_INFINITY : Number(b.distance_km);
        return aDistance - bDistance;
      });
    }

    return items;
  }, [customerProducts, productBrandFilter, productSort]);
  const adminUserTabs = useMemo(() => ({
    active: adminUsers.filter((user) => (user.status || (user.active === false ? "blocked" : "active")) === "active"),
    blocked: adminUsers.filter((user) => (user.status || "") === "blocked"),
    deleted: adminUsers.filter((user) => (user.status || "") === "deleted")
  }), [adminUsers]);
  const adminSalonTabs = useMemo(() => ({
    active: adminSalons.filter((salon) => (salon.status || (salon.active === false ? "blocked" : "active")) === "active"),
    blocked: adminSalons.filter((salon) => (salon.status || (salon.active === false ? "blocked" : "")) === "blocked"),
    deleted: adminSalons.filter((salon) => (salon.status || "") === "deleted")
  }), [adminSalons]);
  const adminBookingTabs = useMemo(() => {
    return {
      confirmed: sortBookingsForTab(adminBookings.filter((booking) => booking.status === "confirmed"), "confirmed"),
      cancelled: sortBookingsForTab(adminBookings.filter((booking) => booking.status === "cancelled"), "cancelled"),
      completed: sortBookingsForTab(adminBookings.filter((booking) => booking.status === "completed"), "completed")
    };
  }, [adminBookings]);

  useEffect(() => {
    if (isLoggedIn) {
      loadNotifications();
      loadMyProfile();
    }
    if (isLoggedIn && role === "customer") {
      loadSalons();
      loadProducts();
      loadPaymentRules();
      handlePaymentReturn();
    }
    if (isLoggedIn && role === "barber") {
      loadMySalons();
      loadBarberProducts();
      loadBarberProductOrders();
    }
    if (isLoggedIn && role === "admin") {
      loadAdminDashboard();
    }
    // Run only when the auth state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, role]);

  useEffect(() => {
    if (!boardPhotoFile) {
      setBoardPhotoPosition(normalizeImagePosition(selectedBarberSalon?.imagePosition));
    }
  }, [boardPhotoFile, selectedBarberSalon]);

  useEffect(() => {
    if (!productImageFile && editingProductId) {
      const product = barberProducts.find((item) => item._id === editingProductId);
      if (product) {
        setProductImagePosition(normalizeImagePosition(product.imagePosition));
      }
    }
  }, [barberProducts, editingProductId, productImageFile]);

  useEffect(() => {
    if (!barberNotice) {
      return undefined;
    }

    const timer = setTimeout(() => setBarberNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [barberNotice]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPromptEvent(event);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const filteredSalons = useMemo(() => {
    const text = search.trim().toLowerCase();

    let filtered = text ? salons.filter((salon) => {
      const name = salon.name?.toLowerCase() || "";
      const address = salon.address?.toLowerCase() || "";
      return name.includes(text) || address.includes(text);
    }) : salons;

    if (customerServiceTypeFilter !== "all") {
      filtered = filtered.filter((salon) => {
        const professionalType = salon.professional_type || "barber";
        const categories = salon.service_categories || [];
        if (categories.length === 0) {
          return true;
        }

        if (customerServiceTypeFilter === "barber") {
          return professionalType === "barber" || categories.includes("hair");
        }

        if (customerServiceTypeFilter === "beautician") {
          return professionalType === "beautician" || categories.includes("beauty");
        }

        if (customerServiceTypeFilter === "makeup_artist") {
          return professionalType === "makeup_artist" || categories.includes("makeup");
        }

        return true;
      });
    }

    return [...filtered].sort((a, b) => {
      if (salonSort === "nearest") {
        const aDistance = a.distance_km == null ? Number.POSITIVE_INFINITY : Number(a.distance_km);
        const bDistance = b.distance_km == null ? Number.POSITIVE_INFINITY : Number(b.distance_km);
        return aDistance - bDistance;
      }

      if (salonSort === "most_reviewed") {
        return (b.rating_count || 0) - (a.rating_count || 0) || (b.average_rating || 0) - (a.average_rating || 0);
      }

      if (salonSort === "newest") {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }

      return (b.average_rating || 0) - (a.average_rating || 0) || (b.rating_count || 0) - (a.rating_count || 0);
    });
  }, [customerServiceTypeFilter, salons, search, salonSort]);

  const filteredServices = useMemo(() => {
    if (customerServiceTypeFilter === "all") {
      return services;
    }

    const categoryMap = {
      barber: "hair",
      beautician: "beauty",
      makeup_artist: "makeup"
    };

    return services.filter((service) => (service.service_category || "hair") === categoryMap[customerServiceTypeFilter]);
  }, [customerServiceTypeFilter, services]);

  const selectedService = useMemo(
    () => services.find((service) => service._id === selectedServiceId),
    [services, selectedServiceId]
  );

  const selectedServicePayment = useMemo(() => {
    if (!selectedService) {
      return null;
    }

    const servicePrice = Number(selectedService.price || 0);
    const bookingFeeAmount = Number((servicePrice * Number(paymentRules.booking_fee_percentage || 0) / 100).toFixed(2));
    const cancellationChargeAmount = Number((servicePrice * Number(paymentRules.cancellation_charge_percentage || 0) / 100).toFixed(2));

    return {
      servicePrice,
      bookingFeeAmount,
      remainingPayAtSalon: Number((servicePrice - bookingFeeAmount).toFixed(2)),
      cancellationChargeAmount
    };
  }, [selectedService, paymentRules]);

  const updateAuthField = (field, value) => {
    setAuthForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "role" && value !== "barber" ? { professional_type: "barber" } : {})
    }));
    if (field === "role" && value !== "barber") {
      setSignupProfilePhoto(null);
      setSignupProfilePreview("");
    }
  };

  const installApp = async () => {
    if (!installPromptEvent) {
      return;
    }

    installPromptEvent.prompt();
    await installPromptEvent.userChoice.catch(() => null);
    setInstallPromptEvent(null);
  };

  const renderOfflineNotice = () => (
    isOffline ? (
      <div style={styles.offlineBanner}>
        You are offline. Cached screens may still work, but live data and API actions need an internet connection.
      </div>
    ) : null
  );

  const handleSignupProfilePhotoChange = (event) => {
    const file = event.target.files?.[0];
    setMessage("");

    if (!file) {
      setSignupProfilePhoto(null);
      setSignupProfilePreview("");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setSignupProfilePhoto(null);
      setSignupProfilePreview("");
      setMessage("Only jpg, jpeg, png, and webp images are allowed");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSignupProfilePhoto(null);
      setSignupProfilePreview("");
      setMessage("Image must be 5MB or smaller");
      return;
    }

    setSignupProfilePhoto(file);
    setSignupProfilePreview(URL.createObjectURL(file));
  };

  const handleProfilePhotoChange = (event) => {
    const file = event.target.files?.[0];
    setProfileNotice(null);

    if (!file) {
      setProfilePhotoFile(null);
      setProfilePhotoPreview(imageUrl(profileForm.profilePhotoUrl || currentUser?.profilePhotoUrl || currentUser?.profile_photo_url || ""));
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setProfilePhotoFile(null);
      setProfileNotice({ type: "error", text: "Only jpg, jpeg, png, and webp images are allowed" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfilePhotoFile(null);
      setProfileNotice({ type: "error", text: "Image must be 5MB or smaller" });
      return;
    }

    setProfilePhotoFile(file);
    setProfilePhotoPreview(URL.createObjectURL(file));
  };

  const showBarberNotice = (type, text) => {
    setBarberNotice({ type, text });
  };

  const hydrateProfileForm = (user = currentUser) => {
    setProfileForm({
      name: user?.name || "",
      phone: user?.phone || "",
      email: user?.email || "",
      address: user?.address || "",
      profilePhotoUrl: user?.profilePhotoUrl || user?.profile_photo_url || ""
    });
    setProfilePhotoFile(null);
    setProfilePhotoPreview(imageUrl(user?.profilePhotoUrl || user?.profile_photo_url || ""));
  };

  const setStoredUser = (user) => {
    localStorage.setItem("user", JSON.stringify(user));
    if (user?.role) {
      localStorage.setItem("role", user.role);
      setRole(user.role);
    }
    setCurrentUser(user);
  };

  const openBarberModal = (modalName) => {
    setBarberMenuOpen(false);
    if (modalName === "profile") {
      hydrateProfileForm();
      setProfileNotice(null);
    }
    setBarberModal(modalName);
    clearBarberFeedback();
  };

  const closeBarberModal = () => {
    setBarberModal("");
    setEditingServiceId("");
    setBoardPhotoMessage("");
    setWorkingHoursMessage("");
    setReserveMessage("");
    setBarberProductMessage("");
    setProfileNotice(null);
  };

  const clearBarberFeedback = () => {
    setBarberNotice(null);
    setBarberConfirm(null);
    setBarberProductMessage("");
  };

  const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token") || token}`
  });

  const loadNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE}/notifications`, { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setNotifications(data.notifications || []);
        setUnreadNotifications(data.unread_count || 0);
        return data.notifications || [];
      }
    } catch (error) {
      // Notifications are helpful but should never block the dashboard.
    }
    return [];
  };

  const markAllNotificationsRead = async () => {
    try {
      const res = await fetch(`${API_BASE}/notifications/read-all`, {
        method: "PATCH",
        headers: authHeaders()
      });

      if (res.ok) {
        await loadNotifications();
      }
    } catch (error) {
      // Keep existing notification state if the network fails.
    }
  };

  const markVisibleNotificationsRead = async (visibleNotifications = notifications) => {
    const unreadVisible = visibleNotifications.filter((notification) => !notification.is_read);

    if (unreadVisible.length === 0) {
      return;
    }

    setNotifications((current) => current.map((notification) => (
      unreadVisible.some((item) => item._id === notification._id)
        ? { ...notification, is_read: true }
        : notification
    )));
    setUnreadNotifications((current) => Math.max(current - unreadVisible.length, 0));

    try {
      await Promise.all(
        unreadVisible.map((notification) => fetch(`${API_BASE}/notifications/${notification._id}/read`, {
          method: "PATCH",
          headers: authHeaders()
        }))
      );
    } catch (error) {
      // The badge stays cleared locally; the next load will resync from backend.
    }
  };

  const renderNotificationBell = () => (
    <div style={styles.notificationWrap}>
      <button
        type="button"
        onClick={() => {
          const opening = !notificationsOpen;
          setNotificationsOpen(opening);
          if (opening) {
            markVisibleNotificationsRead();
            loadNotifications().then((loaded) => markVisibleNotificationsRead(loaded));
          }
        }}
        style={styles.notificationButton}
        aria-label="Open notifications"
      >
        <Icon name="notifications" />
        {unreadNotifications > 0 && <span style={styles.notificationBadge}>{unreadNotifications}</span>}
      </button>

      {notificationsOpen && (
        <div style={styles.notificationPanel}>
          <div style={styles.sectionHeader}>
            <strong>Notifications</strong>
            <button type="button" onClick={markAllNotificationsRead} style={styles.linkButton}>Mark all read</button>
          </div>
          {notifications.length === 0 ? (
            <p style={styles.message}>No notifications yet</p>
          ) : (
            notifications.slice(0, 8).map((notification) => (
              <div
                key={notification._id}
                style={{
                  ...styles.notificationItem,
                  ...(notification.is_read ? {} : styles.unreadNotificationItem)
                }}
              >
                <strong>{notification.title}</strong>
                <span>{notification.message}</span>
                <small>{formatDateTime(notification.createdAt)}</small>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );

  const earningsQuery = (filters) => {
    const params = new URLSearchParams({
      view: filters.view,
      year: filters.year || String(currentYear)
    });

    if (filters.view === "monthly") {
      params.set("month", filters.month || String(currentMonth));
    }

    return params.toString();
  };

  const chartLabelKey = (report) => report?.view === "yearly" ? "month" : "date";

  const renderEarningsChart = (report) => {
    if (!report?.chart_data?.length) {
      return <p style={styles.message}>No chart data yet</p>;
    }

    return (
      <div style={styles.chartBox}>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={report.chart_data} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={chartLabelKey(report)} />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="barber_earnings" stroke="#0f766e" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="admin_commission" stroke="#b7791f" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="service_value" stroke="#1d4ed8" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

  const downloadEarningsCsv = (report, prefix, includeBarber = false) => {
    if (!report?.items?.length) {
      return;
    }

    const headers = [
      "Date",
      "Customer",
      ...(includeBarber ? ["Service Provider"] : []),
      "Salon",
      "Service",
      "Status",
      "Service Price",
      "Booking Fee",
      "Cancellation Charge",
      "Admin Commission",
      "Service Provider Earning",
      "Payment Status"
    ];
    const rows = report.items.map((item) => [
      item.date,
      item.customer_name,
      ...(includeBarber ? [item.barber_name] : []),
      item.salon_name,
      item.service_name,
      item.status,
      item.service_price,
      item.booking_fee_amount,
      item.cancellation_charge_amount,
      item.admin_commission_amount,
      item.barber_earning_amount,
      item.payment_status
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    const suffix = report.view === "yearly"
      ? `${report.year}`
      : `${report.year}_${String(report.month).padStart(2, "0")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${prefix}_earnings_${suffix}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderEarningsFilters = ({ filters, setFilters, onApply, report, csvPrefix, includeBarber }) => (
    <>
      <div style={styles.filterGrid}>
        <select
          value={filters.view}
          onChange={(event) => setFilters((current) => ({ ...current, view: event.target.value }))}
          style={styles.input}
        >
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
        {filters.view === "monthly" && (
          <select
            value={filters.month}
            onChange={(event) => setFilters((current) => ({ ...current, month: event.target.value }))}
            style={styles.input}
          >
            {monthOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        )}
        <input
          type="number"
          min="2020"
          max="2100"
          value={filters.year}
          onChange={(event) => setFilters((current) => ({ ...current, year: event.target.value }))}
          style={styles.input}
        />
        <button type="button" onClick={() => onApply(filters)} style={styles.primaryButton}>Apply</button>
        <button
          type="button"
          onClick={() => downloadEarningsCsv(report, csvPrefix, includeBarber)}
          disabled={!report?.items?.length}
          style={styles.smallButton}
        >
          Download CSV
        </button>
      </div>
    </>
  );

  const handlePaymentReturn = async () => {
    const path = window.location.pathname;

    if (!path.startsWith("/payment-return") && !path.startsWith("/payment-cancelled")) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const bookingId = params.get("booking_id");

    if (!bookingId) {
      setPaymentNotice("Payment returned, but booking reference was missing.");
      return;
    }

    if (path.startsWith("/payment-cancelled")) {
      setPaymentNotice("Payment was cancelled. The slot will be released automatically if payment is not completed.");
      setCustomerTab("appointments");
      await loadCustomerBookings();
      window.history.replaceState({}, "", "/");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/payments/status/${bookingId}`, {
        headers: authHeaders()
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setPaymentNotice(data.message || "Could not check payment status");
        return;
      }

      setPaymentNotice(
        data.payment_status === "paid"
          ? "Payment confirmed. Your booking is confirmed."
          : `Payment status is ${data.payment_status}. We will confirm after PayHere notifies the server.`
      );
      setCustomerTab("appointments");
      await loadCustomerBookings();
      window.history.replaceState({}, "", "/");
    } catch (error) {
      setPaymentNotice("Could not connect to the server to check payment status");
    }
  };

  const saveSession = (data) => {
    localStorage.setItem("token", data.token);
    setToken(data.token);
    setStoredUser(data.user);
    hydrateProfileForm(data.user);
    setMessage("");
  };

  const loadMyProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/profile/me`, {
        headers: authHeaders()
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return;
      }

      if (data.user) {
        setStoredUser(data.user);
        hydrateProfileForm(data.user);
      }
    } catch (error) {
      // Keep the stored user if the profile refresh fails.
    }
  };

  const login = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    if (!authForm.phone.trim() || !authForm.password) {
      setMessage("Mobile number and password are required");
      setLoading(false);
      return;
    }

    try {
      const loginUrl = `${API_BASE}/auth/login`;
      console.log("Login request URL:", loginUrl);
      const res = await fetch(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneOrEmail: authForm.phone.trim(),
          password: authForm.password
        })
      });
      const data = await res.json().catch(() => ({}));
      console.log("Login response:", { ok: res.ok, status: res.status, data });

      if (!res.ok) {
        setMessage(data.message || "Login failed");
        return;
      }

      saveSession(data);
    } catch (error) {
      setMessage("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const signup = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    if (!authForm.name.trim() || !authForm.phone.trim() || !authForm.password) {
      setMessage("Name, mobile number, and password are required");
      setLoading(false);
      return;
    }

    if (authForm.role === "barber" && !signupProfilePhoto) {
        setMessage("Profile photo is required for service provider signup");
      setLoading(false);
      return;
    }

    try {
      const requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: authForm.name.trim(),
          phone: authForm.phone.trim(),
          email: authForm.email.trim() || undefined,
          password: authForm.password,
          role: authForm.role,
          professional_type: authForm.professional_type
        })
      };

      if (authForm.role === "barber") {
        const formData = new FormData();
        formData.append("name", authForm.name.trim());
        formData.append("phone", authForm.phone.trim());
        if (authForm.email.trim()) {
          formData.append("email", authForm.email.trim());
        }
        formData.append("password", authForm.password);
        formData.append("role", authForm.role);
        formData.append("professional_type", authForm.professional_type || "barber");
        formData.append("profile_photo", signupProfilePhoto);
        requestOptions.headers = undefined;
        requestOptions.body = formData;
      }

      const signupUrl = `${API_BASE}/auth/signup`;
      console.log("Signup request URL:", signupUrl);
      const res = await fetch(signupUrl, requestOptions);
      const data = await res.json().catch(() => ({}));
      console.log("Signup response:", { ok: res.ok, status: res.status, data });

      if (!res.ok) {
        setMessage(data.message || "Signup failed");
        return;
      }

      saveSession(data);
      setSignupProfilePhoto(null);
      setSignupProfilePreview("");
    } catch (error) {
      setMessage("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    setToken("");
    setRole("");
    setCurrentUser({});
    setProfileForm({ name: "", phone: "", email: "", address: "", profilePhotoUrl: "" });
    setProfilePhotoFile(null);
    setProfilePhotoPreview("");
    setProfileNotice(null);
    setSignupProfilePhoto(null);
    setSignupProfilePreview("");
    setSalons([]);
    setSalonSort("top_rated");
    setServices([]);
    setSlots([]);
    setSelectedSalon(null);
    setSelectedServiceId("");
    setBookingError("");
    setBookingSuccess(null);
    setBookingToCancel(null);
    setCancelBookingMessage("");
    setBarberSalons([]);
    setSelectedBarberSalonId("");
    setBarberServices([]);
    setBarberBookings([]);
    setBarberAllBookings([]);
    setBarberInsights(null);
    setBarberEarnings(null);
    setBarberEarningsFilters({ view: "monthly", month: String(currentMonth), year: String(currentYear) });
    setBarberEarningsOpen(false);
    setBarberMainTab("dashboard");
    setBarberBookingTab("confirmed");
    setBarberMenuOpen(false);
    setBarberModal("");
    setBarberProducts([]);
    setBarberProductOrders([]);
    setBarberProductMessage("");
    setProductForm({ name: "", brand: "", description: "", price: "", stock_quantity: "", category: "", salon_id: "", active: true });
    setProductImageFile(null);
    setProductImagePreview("");
    setEditingProductId("");
    setReservedSlots([]);
    setBarberNotice(null);
    setBarberConfirm(null);
    setReserveMessage("");
    setCopyFromSalonId("");
    setCustomerTab("book");
    setCustomerBookings([]);
    setCustomerBookingTab("confirmed");
    setCustomerProducts([]);
    setCustomerProductOrders([]);
    setProductOrderQuantities({});
    setProductSearch("");
    setProductSalonFilter("");
    setProductListingMode("salon");
    setCustomerProductLocation(null);
    setShopMessage("");
    setCustomerMenuOpen(false);
    setRatingModalBooking(null);
    setRatingMessage("");
    setEditingServiceId("");
    setPaymentNotice("");
    setWorkingHoursMessage("");
    setAdminUsers([]);
    setAdminSalons([]);
    setAdminBookings([]);
    setAdminProducts([]);
    setAdminProductOrders([]);
    setBookingFeeForm("0");
    setCancellationChargeForm("0");
    setCommissionForm("0");
    setBookingFeeExample(null);
    setAdminBusinessSummary(null);
    setAdminEarnings(null);
    setAdminEarningsFilters({ view: "monthly", month: String(currentMonth), year: String(currentYear) });
    setAdminConfirm(null);
    setAdminSalonConfirm(null);
    setAdminClearConfirm(null);
    setAdminClearText("");
    setAdminSummaryRange("this_month");
    setNotifications([]);
    setUnreadNotifications(0);
    setNotificationsOpen(false);
    setAdminMessage("");
    setAdminTab("users");
    setAdminUserTab("active");
    setAdminSalonTab("active");
    setAdminBookingTab("confirmed");
    setMessage("");
  };

  const loadSalons = async () => {
    setLoading(true);
    setMessage("");

    try {
      const url = `${API_BASE}/salons`;
      console.log("Salon request URL:", url);
      const res = await fetch(url);
      const data = await res.json().catch(() => []);
      console.log("Loaded salons:", Array.isArray(data) ? data : []);

      if (!res.ok) {
        setMessage(data.message || "Could not load salons");
        return;
      }

      setSalons(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async (options = {}) => {
    try {
      const nextMode = options.mode ?? productListingMode;
      const nextLocation = options.location ?? customerProductLocation;
      const params = new URLSearchParams();

      if ((options.search ?? productSearch).trim()) {
        params.set("search", (options.search ?? productSearch).trim());
      }

      if (options.salonId ?? productSalonFilter) {
        params.set("salon_id", options.salonId ?? productSalonFilter);
      }

      if (nextMode === "nearby" && nextLocation?.lat != null && nextLocation?.lng != null) {
        params.set("lat", String(nextLocation.lat));
        params.set("lng", String(nextLocation.lng));
        params.set("sort", "distance");
      }

      const query = params.toString();
      const res = await fetch(`${API_BASE}/products${query ? `?${query}` : ""}`);
      const data = await res.json().catch(() => []);

      if (!res.ok) {
      setShopMessage(data.message || data.error || "Could not load cosmetics");
        return;
      }

      setCustomerProducts(data);
      if (options.mode) {
        setProductListingMode(options.mode);
      }
      if (options.location !== undefined) {
        setCustomerProductLocation(options.location);
      }
    } catch (error) {
      setShopMessage("Could not connect to the server");
    }
  };

  const applyProductFilters = async () => {
    setShopMessage("");
    if (productListingMode === "nearby") {
      if (!navigator.geolocation) {
        setShopMessage("Geolocation is not supported by this browser");
        await loadProducts({ mode: "salon", location: null });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            lat: Number(position.coords.latitude.toFixed(6)),
            lng: Number(position.coords.longitude.toFixed(6)),
          };
          await loadProducts({ mode: "nearby", location });
        },
        async () => {
          setShopMessage("Location permission denied. Showing normal cosmetics list.");
          await loadProducts({ mode: "salon", location: null });
        }
      );
      return;
    }

    await loadProducts({ mode: "salon", location: null });
  };

  const clearSalonFilters = async () => {
    setSearch("");
    setSalonSort("top_rated");
    setCustomerServiceTypeFilter("all");
    setSelectedSalon(null);
    setSelectedServiceId("");
    setServices([]);
    setSlots([]);
    await loadSalons();
  };

  const clearProductFilters = async () => {
    setProductSearch("");
    setProductBrandFilter("");
    setProductSalonFilter("");
    setProductListingMode("salon");
    setProductSort("distance");
    setCustomerProductLocation(null);
    await loadProducts({ search: "", salonId: "", mode: "salon", location: null });
  };

  const loadPaymentRules = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/payment-rules`);
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setPaymentRules({
          booking_fee_percentage: data.booking_fee_percentage ?? 0,
          cancellation_charge_percentage: data.cancellation_charge_percentage ?? 0,
          commission_percentage: data.commission_percentage ?? 0
        });
      }
    } catch (error) {
      // Keep defaults so booking still works if the settings endpoint is unavailable.
    }
  };

  const loadNearbySalons = () => {
    if (!navigator.geolocation) {
      setMessage("Geolocation is not supported by this browser");
      return;
    }

    setLoading(true);
    setMessage("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const url = `${API_BASE}/salons/nearby?lat=${latitude}&lng=${longitude}`;
          console.log("Salon request URL:", url);
          const res = await fetch(url);
          const data = await res.json().catch(() => []);

          if (!res.ok) {
            setMessage(data.message || "Could not load nearby salons");
            return;
          }

          setSalons(data);
        } catch (error) {
          setMessage("Could not connect to the server");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
        setMessage("Please allow location access to find nearby salons");
      }
    );
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setLoading(true);
    setProfileNotice(null);

    try {
      const formData = new FormData();
      formData.append("name", profileForm.name.trim());
      formData.append("phone", profileForm.phone.trim());
      formData.append("email", profileForm.email.trim());
      formData.append("address", profileForm.address.trim());
      if (profilePhotoFile) {
        formData.append("profile_photo", profilePhotoFile);
      } else if (profileForm.profilePhotoUrl.trim()) {
        formData.append("profilePhotoUrl", profileForm.profilePhotoUrl.trim());
      }

      const res = await fetch(`${API_BASE}/profile/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || token}`
        },
        body: formData
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setProfileNotice({ type: "error", text: data.message || data.error || "Could not update profile" });
        return;
      }

      if (data.user) {
        setStoredUser(data.user);
        hydrateProfileForm(data.user);
      }

      setProfileNotice({ type: "success", text: data.message || "Profile updated successfully" });
      if (role === "barber") {
        showBarberNotice("success", data.message || "Profile updated successfully");
      } else if (role === "admin") {
        setAdminMessage(data.message || "Profile updated successfully");
      }
    } catch (error) {
      setProfileNotice({ type: "error", text: error.message || "Could not connect to the server" });
    } finally {
      setLoading(false);
    }
  };

  const selectSalon = async (salon) => {
    setSelectedSalon(salon);
    setSalonDetailsOpen(true);
    setSelectedServiceId("");
    setServices([]);
    setSlots([]);
    setBookingError("");
    setBookingSuccess(null);
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/services/salon/${salon._id}`);
      const data = await res.json().catch(() => []);

      if (!res.ok) {
        setMessage(data.message || data.error || "Could not load services");
        return;
      }

      setServices(data);
      if (data.length === 0) {
        setMessage("No services added for this salon yet");
      }
    } catch (error) {
      setMessage(error.message || "Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const loadAvailability = async (serviceId = selectedServiceId, bookingDate = date) => {
    if (!selectedSalon || !serviceId) {
      setSlots([]);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const url = `${API_BASE}/salons/${selectedSalon._id}/availability?date=${bookingDate}&service_id=${serviceId}`;
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSlots([]);
        setMessage(data.message || "Could not load available slots");
        return;
      }

      setSlots(data.slots || []);
      if ((data.slots || []).length === 0) {
        setMessage("No available slots for this service and date");
      }
    } catch (error) {
      setSlots([]);
      setMessage("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const chooseService = async (serviceId) => {
    setSelectedServiceId(serviceId);
    setSlots([]);
    setBookingError("");
    setBookingSuccess(null);
    await loadAvailability(serviceId);
  };

  const handleDateChange = async (event) => {
    setDate(event.target.value);
    setSlots([]);
    setBookingError("");
    setBookingSuccess(null);

    if (selectedServiceId) {
      await loadAvailability(selectedServiceId, event.target.value);
    }
  };

  const isPastSlot = (slot) => {
    if (date !== today) {
      return false;
    }

    const slotStart = new Date(`${date}T${slot.start_time}:00`);
    return slotStart < new Date();
  };

  const bookSlot = async (slot) => {
    if (!token) {
      setBookingError("Please login first");
      return;
    }

    if (role !== "customer") {
      setBookingError("Only customers can book appointments");
      return;
    }

    setLoading(true);
    setBookingError("");
    setBookingSuccess(null);

    try {
      const res = await fetch(`${API_BASE}/bookings`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          salon_id: selectedSalon._id,
          service_id: selectedServiceId,
          date,
          start_time: slot.start_time
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setBookingError(data.message || "Booking failed");
        return;
      }

      setBookingSuccess({
        salonName: selectedSalon?.name || "Selected salon",
        serviceName: selectedService?.name || "Selected service",
        date,
        start_time: data.start_time || slot.start_time,
        end_time: data.end_time || slot.end_time,
        status: "Confirmed"
      });
      await loadAvailability(selectedServiceId, date);
      await loadCustomerBookings();
      await loadNotifications();
    } catch (error) {
      setBookingError("Could not connect to the booking server");
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerBookings = async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`${API_BASE}/bookings/my`, {
        headers: authHeaders()
      });
      const data = await res.json().catch(() => []);

      if (!res.ok) {
        setMessage(data.message || "Could not load my bookings");
        return;
      }

      setCustomerBookings(data);
    } catch (error) {
      setMessage("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerProductOrders = async () => {
    setLoading(true);
    setShopMessage("");

    try {
      const res = await fetch(`${API_BASE}/product-orders/my`, {
        headers: authHeaders()
      });
      const data = await res.json().catch(() => []);

      if (!res.ok) {
      setShopMessage(data.message || data.error || "Could not load cosmetics orders");
        return;
      }

      setCustomerProductOrders(data);
    } catch (error) {
      setShopMessage("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const placeProductOrder = async (product) => {
    const quantity = Number(productOrderQuantities[product._id] || 1);

    if (!Number.isInteger(quantity) || quantity < 1) {
      setShopMessage("Quantity must be at least 1");
      return;
    }

    setLoading(true);
    setShopMessage("");

    try {
      const res = await fetch(`${API_BASE}/product-orders`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          product_id: product._id,
          quantity
        })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setShopMessage(data.message || data.error || "Could not place cosmetics order");
        return;
      }

        setShopMessage("Cosmetics order placed");
        setProductOrderQuantities((current) => ({ ...current, [product._id]: 1 }));
        setSelectedCosmetic(null);
        await loadProducts();
      await loadCustomerProductOrders();
    } catch (error) {
      setShopMessage(error.message || "Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const isFutureConfirmedBooking = (booking) => {
    if (booking.status !== "confirmed") {
      return false;
    }

    const bookingStart = new Date(`${booking.date}T${booking.start_time}:00`);
    return bookingStart > new Date();
  };

  const askCancelBooking = (booking) => {
    setBookingToCancel(booking);
    setCancelBookingMessage("");
  };

  const cancelBooking = async () => {
    if (!bookingToCancel) {
      return;
    }

    const booking = bookingToCancel;
    setLoading(true);
    setCancelBookingMessage("");

    try {
      const res = await fetch(`${API_BASE}/bookings/${booking._id}/cancel`, {
        method: "PATCH",
        headers: authHeaders()
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setCancelBookingMessage(data.message || "Could not cancel booking");
        return;
      }

      setBookingToCancel(null);
      setCancelBookingMessage("Booking cancelled");
      await loadCustomerBookings();
      await loadNotifications();

      const sameVisibleSlot =
        selectedSalon?._id === (booking.salon_id?._id || booking.salon_id) &&
        selectedServiceId === (booking.service_id?._id || booking.service_id) &&
        date === booking.date;

      if (sameVisibleSlot) {
        await loadAvailability(selectedServiceId, date);
      }
    } catch (error) {
      setCancelBookingMessage("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const visibleCancellationCharge = (booking) => (
    booking.cancellation_charge_waived ? 0 : Number(booking.customer_charged_amount ?? booking.cancellation_charge_amount ?? 0)
  );

  const visibleAdminCommission = (booking) => (
    booking.cancellation_charge_waived ? 0 : Number(booking.admin_commission_amount ?? booking.platform_commission_amount ?? booking.commission_amount ?? 0)
  );

  const visibleBarberEarning = (booking) => (
    booking.cancellation_charge_waived ? 0 : Number(booking.barber_earning_amount || 0)
  );

  const customerCancellationDetails = (booking) => {
    if (booking.status !== "cancelled") {
      return null;
    }

    const charged = visibleCancellationCharge(booking);

    return (
      <>
        <span>Cancelled by: {roleLabel(booking.cancelled_by_role)}</span>
        <span>Charged: Rs. {charged}</span>
        <span>Reason: {charged > 0 ? "Cancellation charge" : "No cancellation charge applied"}</span>
      </>
    );
  };

  const barberCancellationDetails = (booking) => {
    if (booking.status !== "cancelled") {
      return null;
    }

    const earning = visibleBarberEarning(booking);

    return (
      <>
        <span>Cancelled by: {roleLabel(booking.cancelled_by_role)}</span>
        <span>Service Provider earned: Rs. {earning}</span>
        <span>Source: {earning > 0 ? "Cancellation charge after commission" : "No cancellation earning"}</span>
      </>
    );
  };

  const openRatingModal = (booking) => {
    setRatingModalBooking(booking);
    setRatingForm({ rating: 5, comment: "" });
    setRatingMessage("");
  };

  const submitRating = async (event) => {
    event.preventDefault();

    if (!ratingModalBooking) {
      return;
    }

    setLoading(true);
    setRatingMessage("");

    try {
      const salonId = ratingModalBooking.salon_id?._id || ratingModalBooking.salon_id;
      const res = await fetch(`${API_BASE}/salons/${salonId}/ratings`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          booking_id: ratingModalBooking._id,
          rating: Number(ratingForm.rating),
          comment: ratingForm.comment.trim() || undefined
        })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setRatingMessage(data.message || "Could not submit rating");
        return;
      }

      setRatingMessage("Rating saved");
      setRatingModalBooking(null);
      await loadCustomerBookings();
      await loadSalons();
    } catch (error) {
      setRatingMessage("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const loadMySalons = async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`${API_BASE}/salons/mine`, {
        headers: authHeaders()
      });
      const data = await res.json().catch(() => []);

      if (!res.ok) {
        setMessage(data.message || "Could not load your salons");
        return;
      }

      const salonsWithCounts = await Promise.all(
        data.map(async (salon) => {
          const [servicesRes, bookingsRes] = await Promise.all([
            fetch(`${API_BASE}/services/salon/${salon._id}`),
            fetch(`${API_BASE}/bookings/salon/${salon._id}/daily?date=${today}`, {
              headers: authHeaders()
            })
          ]);
          const servicesData = servicesRes.ok ? await servicesRes.json().catch(() => []) : [];
          const bookingsData = bookingsRes.ok ? await bookingsRes.json().catch(() => []) : [];

          return {
            ...salon,
            servicesCount: servicesData.length,
            bookingsCount: bookingsData.length
          };
        })
      );

      setBarberSalons(salonsWithCounts);

      if (selectedBarberSalonId) {
        const selectedStillExists = salonsWithCounts.some((salon) => salon._id === selectedBarberSalonId);

        if (selectedStillExists) {
          await loadBarberServices(selectedBarberSalonId);
          await loadTodayBookings(selectedBarberSalonId);
          await loadReservedSlots(selectedBarberSalonId);
        } else {
          startNewSalon();
        }
      }

      await loadBarberAllBookings();
      await loadBarberInsights();
      await loadBarberProducts();
      await loadBarberProductOrders();
    } catch (error) {
      setMessage("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const selectBarberSalon = async (salonId) => {
    const salon = barberSalons.find((item) => item._id === salonId);
    setSelectedBarberSalonId(salonId);
    setBarberServices([]);
    setBarberBookings([]);
    setReservedSlots([]);
    setBoardPhotoFile(null);
    setBoardPhotoPreview("");
    setBoardPhotoPosition(normalizeImagePosition(salon?.imagePosition));
    setBoardPhotoMessage("");
    setProductForm((current) => ({ ...current, salon_id: salonId || "" }));

    if (salon) {
      setSalonForm({
        name: salon.name || "",
        address: salon.address || "",
        phone: salon.phone || "",
        latitude: salon.latitude ?? "",
        longitude: salon.longitude ?? ""
      });
      setWorkingHoursForm({
        open: salon.workingHours?.open || "09:00",
        close: salon.workingHours?.close || "18:00",
        slotIntervalMinutes: salon.workingHours?.slotIntervalMinutes || 15,
        workingDays: [0, 1, 2, 3, 4, 5, 6].filter(
          (day) => !(salon.workingHours?.closedDays || []).includes(day)
        )
      });
    }

    if (salonId) {
      await loadBarberServices(salonId);
      await loadTodayBookings(salonId);
      await loadReservedSlots(salonId);
      await loadBarberAllBookings();
    }
  };

  const startNewSalon = () => {
    setSelectedBarberSalonId("");
    setSalonForm({ name: "", address: "", phone: "", latitude: "", longitude: "" });
    setBarberServices([]);
    setBarberBookings([]);
    setReservedSlots([]);
    setBoardPhotoFile(null);
    setBoardPhotoPreview("");
    setBoardPhotoPosition(DEFAULT_IMAGE_POSITION);
    setBoardPhotoMessage("");
    setServiceForm({ name: "", service_category: "hair", price: "", duration: "30" });
      setProductForm({ name: "", brand: "", description: "", price: "", stock_quantity: "", category: "", salon_id: "", active: true });
      setProductImagePosition(DEFAULT_IMAGE_POSITION);
    setReserveForm({ date: today, start_time: "12:00", end_time: "12:30", reason: "" });
    setReserveMessage("");
    setWorkingHoursMessage("");
    setWorkingHoursForm({
      open: "09:00",
      close: "18:00",
      slotIntervalMinutes: 15,
      workingDays: [1, 2, 3, 4, 5, 6]
    });
    setCopyFromSalonId("");
    setMessage("");
    clearBarberFeedback();
  };

  const handleProductImageChange = (event) => {
    const file = event.target.files?.[0];
    setBarberProductMessage("");

    if (!file) {
      setProductImageFile(null);
      setProductImagePreview("");
      setProductImagePosition(DEFAULT_IMAGE_POSITION);
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setProductImageFile(null);
      setProductImagePreview("");
      setProductImagePosition(DEFAULT_IMAGE_POSITION);
      setBarberProductMessage("Only jpg, jpeg, png, and webp images are allowed");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProductImageFile(null);
      setProductImagePreview("");
      setProductImagePosition(DEFAULT_IMAGE_POSITION);
      setBarberProductMessage("Image must be 5MB or smaller");
      return;
    }

    setProductImageFile(file);
    setProductImagePreview(URL.createObjectURL(file));
    setProductImagePosition(DEFAULT_IMAGE_POSITION);
  };

  const resetProductForm = () => {
    setProductForm({
      name: "",
      brand: "",
      description: "",
      price: "",
      stock_quantity: "",
      category: "",
      salon_id: selectedBarberSalonId || "",
      active: true
    });
    setProductImageFile(null);
    setProductImagePreview("");
    setProductImagePosition(DEFAULT_IMAGE_POSITION);
    setEditingProductId("");
  };

  const handleBoardPhotoChange = (event) => {
    const file = event.target.files?.[0];
    setBoardPhotoMessage("");

    if (!file) {
      setBoardPhotoFile(null);
      setBoardPhotoPreview("");
      setBoardPhotoPosition(normalizeImagePosition(selectedBarberSalon?.imagePosition));
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setBoardPhotoFile(null);
      setBoardPhotoPreview("");
      setBoardPhotoPosition(normalizeImagePosition(selectedBarberSalon?.imagePosition));
      setBoardPhotoMessage("Only jpg, jpeg, png, and webp images are allowed");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setBoardPhotoFile(null);
      setBoardPhotoPreview("");
      setBoardPhotoPosition(normalizeImagePosition(selectedBarberSalon?.imagePosition));
      setBoardPhotoMessage("Image must be 5MB or smaller");
      return;
    }

    setBoardPhotoFile(file);
    setBoardPhotoPreview(URL.createObjectURL(file));
    setBoardPhotoPosition(DEFAULT_IMAGE_POSITION);
  };

  const uploadBoardPhoto = async (event) => {
    event.preventDefault();

    if (!selectedBarberSalonId) {
      setBoardPhotoMessage("Select a salon first");
      return;
    }

    if (!boardPhotoFile && !selectedBarberSalon?.board_photo_url) {
      setBoardPhotoMessage("Please choose an image to upload");
      return;
    }

    setLoading(true);
    setBoardPhotoMessage("");

    try {
      const formData = new FormData();
      if (boardPhotoFile) {
        formData.append("board_photo", boardPhotoFile);
      }
      formData.append("imagePosition", JSON.stringify(boardPhotoPosition));

      const res = await fetch(`${API_BASE}/salons/${selectedBarberSalonId}/board-photo`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setBoardPhotoMessage(data.message || "Could not upload board photo");
        return;
      }

      setBoardPhotoMessage("Board photo updated");
      setBoardPhotoFile(null);
      setBoardPhotoPreview("");
      setBoardPhotoPosition(normalizeImagePosition(data.salon?.imagePosition || boardPhotoPosition));
      await loadMySalons();
    } catch (error) {
      setBoardPhotoMessage("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const saveSalon = async (event) => {
    event.preventDefault();
    setLoading(true);
    clearBarberFeedback();

    const isEdit = Boolean(selectedBarberSalonId);
    const url = isEdit
      ? `${API_BASE}/salons/${selectedBarberSalonId}`
      : `${API_BASE}/salons`;
    const payload = {
      ...salonForm,
      latitude: salonForm.latitude === "" ? undefined : Number(salonForm.latitude),
      longitude: salonForm.longitude === "" ? undefined : Number(salonForm.longitude)
    };

    try {
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showBarberNotice("error", data.message || "Could not save salon");
        return;
      }

      showBarberNotice("success", "Saved successfully");
      setSelectedBarberSalonId(data._id);
      setSalonForm({
        name: data.name || "",
        address: data.address || "",
        phone: data.phone || "",
        latitude: data.latitude ?? "",
        longitude: data.longitude ?? ""
      });
      await loadMySalons();
      await loadBarberServices(data._id);
      await loadTodayBookings(data._id);
      await loadReservedSlots(data._id);
      await loadBarberAllBookings();
    } catch (error) {
      showBarberNotice("error", "Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const saveWorkingHours = async (event) => {
    event.preventDefault();

    if (!selectedBarberSalonId) {
      setWorkingHoursMessage("Select a salon first");
      return;
    }

    setLoading(true);
    setWorkingHoursMessage("");

    try {
      const closedDays = [0, 1, 2, 3, 4, 5, 6].filter(
        (day) => !workingHoursForm.workingDays.includes(day)
      );
      const res = await fetch(`${API_BASE}/salons/${selectedBarberSalonId}/working-hours`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          workingHours: {
            open: workingHoursForm.open,
            close: workingHoursForm.close,
            slotIntervalMinutes: Number(workingHoursForm.slotIntervalMinutes),
            closedDays
          }
        })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setWorkingHoursMessage(data.message || "Could not save working hours");
        return;
      }

      setWorkingHoursMessage("Working hours saved");
      await loadMySalons();
    } catch (error) {
      setWorkingHoursMessage("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const useCurrentSalonLocation = () => {
    if (!navigator.geolocation) {
      setMessage("Geolocation is not supported by this browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSalonForm((current) => ({
          ...current,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        }));
      },
      () => setMessage("Could not get your location")
    );
  };

  const requestDeleteSalon = () => {
    if (!selectedBarberSalonId) {
      return;
    }

    setBarberConfirm({
      action: "deleteSalon",
      title: "Delete or deactivate this salon?",
      body: "Customers will no longer be able to book this salon if it is deactivated.",
      confirmLabel: "Yes, delete salon"
    });
  };

  const deleteSalon = async () => {
    setLoading(true);
    setBarberNotice(null);

    try {
      const res = await fetch(`${API_BASE}/salons/${selectedBarberSalonId}`, {
        method: "DELETE",
        headers: authHeaders()
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showBarberNotice("error", data.message || "Could not delete salon");
        return;
      }

      setBarberConfirm(null);
      startNewSalon();
      showBarberNotice("success", "Saved successfully");
      await loadMySalons();
    } catch (error) {
      showBarberNotice("error", "Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const requestDeactivateAccount = () => {
    setBarberConfirm({
      action: "deactivateAccount",
      title: "Deactivate your account?",
      body: role === "barber"
        ? "Your salons will be deactivated and customers will not be able to book them."
        : "Your account will be deactivated.",
      confirmLabel: "Yes, deactivate account"
    });
  };

  const deactivateAccount = async () => {
    setLoading(true);
    setBarberNotice(null);

    try {
      const res = await fetch(`${API_BASE}/users/me/deactivate`, {
        method: "PATCH",
        headers: authHeaders()
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showBarberNotice("error", data.message || "Could not deactivate account");
        return;
      }

      showBarberNotice("success", "Saved successfully");
      logout();
    } catch (error) {
      showBarberNotice("error", "Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const loadBarberServices = async (salonId = selectedBarberSalonId) => {
    if (!salonId) {
      setBarberServices([]);
      return;
    }

    const res = await fetch(`${API_BASE}/services/salon/${salonId}/manage`, {
      headers: authHeaders()
    });
    const data = await res.json().catch(() => []);

    if (!res.ok) {
      setMessage(data.message || "Could not load services");
      return;
    }

    setBarberServices(data);
  };

  const loadBarberProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/products/mine`, {
        headers: authHeaders()
      });
      const data = await res.json().catch(() => []);

      if (!res.ok) {
      setBarberProductMessage(data.message || data.error || "Could not load cosmetics");
        return;
      }

      setBarberProducts(data);
    } catch (error) {
      setBarberProductMessage("Could not connect to the server");
    }
  };

  const loadBarberProductOrders = async () => {
    try {
      const ordersUrl = selectedBarberSalonId
        ? `${API_BASE}/product-orders/salon/${selectedBarberSalonId}`
        : `${API_BASE}/product-orders/provider`;
      const res = await fetch(ordersUrl, {
        headers: authHeaders()
      });
      const data = await res.json().catch(() => []);

      if (!res.ok) {
        setBarberProductMessage(data.message || data.error || "Could not load cosmetics orders");
        return;
      }

      setBarberProductOrders(data);
    } catch (error) {
      setBarberProductMessage("Could not connect to the server");
    }
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    setLoading(true);
    setBarberProductMessage("");

    try {
      const formData = new FormData();
      formData.append("name", productForm.name.trim());
      formData.append("brand", productForm.brand.trim());
      formData.append("description", productForm.description.trim());
      formData.append("price", productForm.price);
      formData.append("stock_quantity", productForm.stock_quantity);
      formData.append("category", productForm.category.trim());
      if (productForm.salon_id) {
        formData.append("salon_id", productForm.salon_id);
      }
      formData.append("active", String(productForm.active));
      if (productImageFile) {
        formData.append("image", productImageFile);
      }
      formData.append("imagePosition", JSON.stringify(productImagePosition));

      const res = await fetch(
        editingProductId ? `${API_BASE}/products/${editingProductId}` : `${API_BASE}/products`,
        {
          method: editingProductId ? "PATCH" : "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        }
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setBarberProductMessage(data.message || data.error || "Could not save cosmetic");
        return;
      }

      setBarberProductMessage("Saved successfully");
      resetProductForm();
      await loadBarberProducts();
      await loadProducts();
    } catch (error) {
      setBarberProductMessage("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const startEditProduct = (product) => {
    setEditingProductId(product._id);
    setProductForm({
      name: product.name || "",
      brand: product.brand || "",
      description: product.description || "",
      price: product.price ?? "",
      stock_quantity: product.stock_quantity ?? "",
      category: product.category || "",
      salon_id: product.salon_id?._id || product.salon_id || "",
      active: product.active !== false
    });
    setProductImageFile(null);
    setProductImagePreview(product.image ? imageUrl(product.image) : "");
    setProductImagePosition(normalizeImagePosition(product.imagePosition));
    setBarberProductMessage("");
  };

  const requestDeleteProduct = (product) => {
    setBarberConfirm({
      action: "deleteProduct",
      payload: product,
      title: `Deactivate ${product.name}?`,
      body: "Customers will no longer be able to order this cosmetic.",
      confirmLabel: "Yes, deactivate cosmetic"
    });
  };

  const deleteProduct = async (product) => {
    setLoading(true);
    setBarberProductMessage("");

    try {
      const res = await fetch(`${API_BASE}/products/${product._id}`, {
        method: "DELETE",
        headers: authHeaders()
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setBarberProductMessage(data.message || data.error || "Could not deactivate cosmetic");
        return;
      }

      setBarberConfirm(null);
      setBarberProductMessage(data.message || "Saved successfully");
      if (editingProductId === product._id) {
        resetProductForm();
      }
      await loadBarberProducts();
      await loadProducts();
    } catch (error) {
      setBarberProductMessage("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const updateBarberProductOrder = async (orderId, status, paymentStatus) => {
    setLoading(true);
    setBarberProductMessage("");

    try {
      const body = {};
      if (status) {
        body.status = status;
      }
      if (paymentStatus) {
        body.payment_status = paymentStatus;
      }

      const res = await fetch(`${API_BASE}/product-orders/${orderId}/status`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setBarberProductMessage(data.message || data.error || "Could not update cosmetics order");
        return;
      }

      setBarberProductMessage("Saved successfully");
      await loadBarberProductOrders();
      await loadBarberProducts();
      await loadProducts();
    } catch (error) {
      setBarberProductMessage("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const toggleProductActive = async (product, active) => {
    setLoading(true);
    setBarberProductMessage("");

    try {
      const formData = new FormData();
      formData.append("active", String(active));

      const res = await fetch(`${API_BASE}/products/${product._id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setBarberProductMessage(data.message || data.error || "Could not update cosmetic");
        return;
      }

      setBarberProductMessage("Saved successfully");
      await loadBarberProducts();
      await loadProducts();
    } catch (error) {
      setBarberProductMessage("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const addService = async (event) => {
    event.preventDefault();

    if (!selectedBarberSalonId) {
      showBarberNotice("error", "Create or select a salon first");
      return;
    }

    setLoading(true);
    clearBarberFeedback();

    try {
      const res = await fetch(`${API_BASE}/services`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          salon_id: selectedBarberSalonId,
          name: serviceForm.name.trim(),
          service_category: serviceForm.service_category,
          price: Number(serviceForm.price),
          duration: Number(serviceForm.duration)
        })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showBarberNotice("error", data.message || "Could not add service");
        return;
      }

      setServiceForm({ name: "", service_category: "hair", price: "", duration: "30" });
      showBarberNotice("success", "Saved successfully");
      await loadBarberServices(selectedBarberSalonId);
      await loadMySalons();
    } catch (error) {
      showBarberNotice("error", "Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const startEditService = (service) => {
    setEditingServiceId(service._id);
    setEditServiceForm({
      name: service.name || "",
      description: service.description || "",
      service_category: service.service_category || "hair",
      price: service.price ?? "",
      duration: service.duration || "30",
      active: service.active !== false
    });
  };

  const saveServiceEdit = async (event) => {
    event.preventDefault();
    setLoading(true);
    clearBarberFeedback();

    try {
      const res = await fetch(`${API_BASE}/services/${editingServiceId}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          name: editServiceForm.name.trim(),
          description: editServiceForm.description.trim(),
          service_category: editServiceForm.service_category,
          price: Number(editServiceForm.price),
          duration: Number(editServiceForm.duration),
          active: editServiceForm.active
        })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showBarberNotice("error", data.message || "Could not update service");
        return;
      }

      showBarberNotice("success", "Saved successfully");
      setEditingServiceId("");
      await loadBarberServices(selectedBarberSalonId);
      await loadMySalons();
    } catch (error) {
      showBarberNotice("error", "Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const requestDeleteService = (service) => {
    setBarberConfirm({
      action: "deleteService",
      payload: service,
      title: `Delete ${service.name}?`,
      body: "If this service has bookings, it will be disabled instead of removed.",
      confirmLabel: "Yes, delete service"
    });
  };

  const deleteService = async (service) => {
    setLoading(true);
    setBarberNotice(null);

    try {
      const res = await fetch(`${API_BASE}/services/${service._id}`, {
        method: "DELETE",
        headers: authHeaders()
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showBarberNotice("error", data.message || "Could not delete service");
        return;
      }

      setBarberConfirm(null);
      showBarberNotice("success", "Saved successfully");
      await loadBarberServices(selectedBarberSalonId);
      await loadMySalons();
    } catch (error) {
      showBarberNotice("error", "Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const copyServices = async (event) => {
    event.preventDefault();

    if (!copyFromSalonId || !selectedBarberSalonId) {
      setMessage("Choose a source salon and target salon");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`${API_BASE}/services/copy`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          from_salon_id: copyFromSalonId,
          to_salon_id: selectedBarberSalonId
        })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(data.message || "Could not copy services");
        return;
      }

      setMessage(`Copied ${data.copied} services. Skipped ${data.skipped} duplicates.`);
      setCopyFromSalonId("");
      await loadBarberServices(selectedBarberSalonId);
      await loadMySalons();
    } catch (error) {
      setMessage("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const requestCancelBarberBooking = (booking) => {
    setBarberConfirm({
      action: "cancelBarberBooking",
      payload: booking,
      title: "Cancel this booking?",
      body: "The slot will be released for customers after cancellation.",
      confirmLabel: "Yes, cancel booking"
    });
  };

  const cancelBarberBooking = async (booking) => {
    setLoading(true);
    clearBarberFeedback();

    try {
      const res = await fetch(`${API_BASE}/bookings/${booking._id}/barber-cancel`, {
        method: "PATCH",
        headers: authHeaders()
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showBarberNotice("error", data.message || "Could not cancel booking");
        return;
      }

      setBarberConfirm(null);
      showBarberNotice("success", "Booking cancelled");
      await loadBarberAllBookings();
      await loadTodayBookings(selectedBarberSalonId);
      await loadMySalons();
      await loadNotifications();
    } catch (error) {
      showBarberNotice("error", "Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const confirmBarberAction = async () => {
    if (!barberConfirm) {
      return;
    }

    if (barberConfirm.action === "deleteSalon") {
      await deleteSalon();
      return;
    }

    if (barberConfirm.action === "deactivateAccount") {
      await deactivateAccount();
      return;
    }

    if (barberConfirm.action === "deleteService") {
      await deleteService(barberConfirm.payload);
      return;
    }

    if (barberConfirm.action === "deleteProduct") {
      await deleteProduct(barberConfirm.payload);
      return;
    }

    if (barberConfirm.action === "cancelReservedSlot") {
      await cancelReservedSlot(barberConfirm.payload);
      return;
    }

    if (barberConfirm.action === "cancelBarberBooking") {
      await cancelBarberBooking(barberConfirm.payload);
    }
  };

  const loadTodayBookings = async (salonId = selectedBarberSalonId) => {
    if (!salonId) {
      setBarberBookings([]);
      return;
    }

    const res = await fetch(`${API_BASE}/bookings/salon/${salonId}/daily?date=${today}`, {
      headers: authHeaders()
    });
    const data = await res.json().catch(() => []);

    if (!res.ok) {
      setMessage(data.message || "Could not load bookings");
      return;
    }

    setBarberBookings(data);
  };

  const loadBarberAllBookings = async () => {
    try {
      const res = await fetch(`${API_BASE}/bookings/mine`, { headers: authHeaders() });
      const data = await res.json().catch(() => []);

      if (!res.ok) {
        showBarberNotice("error", data.message || "Could not load bookings");
        return;
      }

      setBarberAllBookings(data);
    } catch (error) {
      showBarberNotice("error", "Could not connect to the server");
    }
  };

  const loadBarberInsights = async () => {
    try {
      const res = await fetch(`${API_BASE}/barber/insights`, { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setBarberInsights(data);
      }
    } catch (error) {
      // Insights should not block booking management.
    }
  };

  const loadBarberEarnings = async (filters = barberEarningsFilters) => {
    setLoading(true);
    setBarberNotice(null);

    try {
      const res = await fetch(`${API_BASE}/barber/earnings?${earningsQuery(filters)}`, { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showBarberNotice("error", data.message || "Could not load earnings");
        return;
      }

      setBarberEarnings(data);
      setBarberEarningsFilters({
        view: data.view || filters.view,
        month: String(data.month || filters.month || currentMonth),
        year: String(data.year || filters.year || currentYear)
      });
      setBarberEarningsOpen(true);
    } catch (error) {
      showBarberNotice("error", "Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const loadReservedSlots = async (salonId = selectedBarberSalonId, reserveDate = reserveForm.date) => {
    if (!salonId || !reserveDate) {
      setReservedSlots([]);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/salons/${salonId}/reserved-slots?date=${reserveDate}`, {
        headers: authHeaders()
      });
      const data = await res.json().catch(() => []);

      if (!res.ok) {
        setMessage(data.message || "Could not load reserved slots");
        return;
      }

      setReservedSlots(data);
    } catch (error) {
      setMessage("Could not connect to the server");
    }
  };

  const reserveSlot = async (event) => {
    event.preventDefault();

    if (!selectedBarberSalonId) {
      setReserveMessage("Select a salon first");
      return;
    }

    setLoading(true);
    setReserveMessage("");

    try {
      const res = await fetch(`${API_BASE}/salons/${selectedBarberSalonId}/reserved-slots`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          date: reserveForm.date,
          start_time: reserveForm.start_time,
          end_time: reserveForm.end_time,
          reason: reserveForm.reason.trim() || undefined
        })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setReserveMessage(data.message || "Could not reserve this time");
        return;
      }

      setReserveMessage("Time slot reserved");
      setReserveForm((current) => ({ ...current, reason: "" }));
      await loadReservedSlots(selectedBarberSalonId, reserveForm.date);
    } catch (error) {
      setReserveMessage("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const requestCancelReservedSlot = (reservedSlotId) => {
    setBarberConfirm({
      action: "cancelReservedSlot",
      payload: reservedSlotId,
      title: "Cancel this reserved slot?",
      body: "Customers will be able to book this time again after it is cancelled.",
      confirmLabel: "Yes, cancel reserved slot"
    });
  };

  const cancelReservedSlot = async (reservedSlotId) => {
    setLoading(true);
    setBarberNotice(null);

    try {
      const res = await fetch(`${API_BASE}/reserved-slots/${reservedSlotId}/cancel`, {
        method: "PATCH",
        headers: authHeaders()
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setReserveMessage(data.message || "Could not cancel reserved slot");
        return;
      }

      setBarberConfirm(null);
      setReserveMessage(data.message || "Reserved slot cancelled");
      showBarberNotice("success", "Saved successfully");
      await loadReservedSlots(selectedBarberSalonId, reserveForm.date);
      await loadBarberAllBookings();
    } catch (error) {
      setReserveMessage("Could not connect to the server");
      showBarberNotice("error", "Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const completeBooking = async (bookingId) => {
    setLoading(true);
    clearBarberFeedback();

    try {
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/complete`, {
        method: "PATCH",
        headers: authHeaders()
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showBarberNotice("error", data.message || "Could not complete booking");
        return;
      }

      showBarberNotice("success", "Saved successfully");
      await loadTodayBookings(selectedBarberSalonId);
      await loadBarberAllBookings();
      await loadMySalons();
    } catch (error) {
      showBarberNotice("error", "Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const loadAdminUsers = async () => {
    const res = await fetch(`${API_BASE}/admin/users`, { headers: authHeaders() });
    const data = await res.json().catch(() => []);

    if (!res.ok) {
      setAdminMessage(data.message || "Could not load users");
      return;
    }

    setAdminUsers(data);
  };

  const loadAdminSalons = async () => {
    const res = await fetch(`${API_BASE}/admin/salons`, { headers: authHeaders() });
    const data = await res.json().catch(() => []);

    if (!res.ok) {
      setAdminMessage(data.message || "Could not load salons");
      return;
    }

    setAdminSalons(data);
  };

  const loadAdminProducts = async () => {
    const res = await fetch(`${API_BASE}/admin/products`, { headers: authHeaders() });
    const data = await res.json().catch(() => []);

    if (!res.ok) {
      setAdminMessage(data.message || data.error || "Could not load cosmetics");
      return;
    }

    setAdminProducts(data);
  };

  const loadAdminProductOrders = async () => {
    const res = await fetch(`${API_BASE}/admin/product-orders`, { headers: authHeaders() });
    const data = await res.json().catch(() => []);

    if (!res.ok) {
      setAdminMessage(data.message || data.error || "Could not load cosmetics orders");
      return;
    }

    setAdminProductOrders(data);
  };

  const loadAdminBookings = async (filters = adminFilters) => {
    const params = new URLSearchParams();

    if (filters.date) {
      params.set("date", filters.date);
    }

    if (filters.salon_id) {
      params.set("salon_id", filters.salon_id);
    }

    if (filters.status) {
      params.set("status", filters.status);
    }

    const query = params.toString();
    const res = await fetch(`${API_BASE}/admin/bookings${query ? `?${query}` : ""}`, {
      headers: authHeaders()
    });
    const data = await res.json().catch(() => []);

    if (!res.ok) {
      setAdminMessage(data.message || "Could not load bookings");
      return;
    }

    setAdminBookings(data);
  };

  const loadBookingFeeSetting = async () => {
    const res = await fetch(`${API_BASE}/admin/settings/payment-rules`, {
      headers: authHeaders()
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setAdminMessage(data.message || "Could not load booking fee setting");
      return;
    }

    setBookingFeeForm(String(data.booking_fee_percentage ?? 0));
    setCancellationChargeForm(String(data.cancellation_charge_percentage ?? 0));
    setCommissionForm(String(data.commission_percentage ?? 0));
    setBookingFeeExample(data.example);
  };

  const loadAdminBusinessSummary = async (range = adminSummaryRange) => {
    const res = await fetch(`${API_BASE}/admin/business-summary?range=${range}`, {
      headers: authHeaders()
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setAdminMessage(data.message || "Could not load business summary");
      return;
    }

    setAdminBusinessSummary(data);
  };

  const loadAdminEarnings = async (filters = adminEarningsFilters) => {
    setLoading(true);
    setAdminMessage("");

    try {
      const res = await fetch(`${API_BASE}/admin/earnings?${earningsQuery(filters)}`, {
        headers: authHeaders()
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setAdminMessage(data.message || "Could not load earnings");
        return;
      }

      setAdminEarnings(data);
      setAdminEarningsFilters({
        view: data.view || filters.view,
        month: String(data.month || filters.month || currentMonth),
        year: String(data.year || filters.year || currentYear)
      });
    } catch (error) {
      setAdminMessage("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const loadAdminDashboard = async () => {
    setLoading(true);
    setAdminMessage("");

    try {
      await Promise.all([
        loadAdminUsers(),
        loadAdminSalons(),
        loadAdminBookings(),
        loadAdminProducts(),
        loadAdminProductOrders(),
        loadBookingFeeSetting(),
        loadAdminBusinessSummary(),
        loadAdminEarnings()
      ]);
    } catch (error) {
      setAdminMessage("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminProduct = async (product, active) => {
    try {
      const res = await fetch(`${API_BASE}/admin/products/${product._id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ active })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setAdminMessage(data.message || data.error || "Could not update cosmetic");
        return;
      }

      setAdminMessage(active ? "Cosmetic reactivated" : "Cosmetic deactivated");
      await loadAdminProducts();
      await loadProducts();
    } catch (error) {
      setAdminMessage("Could not connect to the server");
    }
  };

  const updateAdminUser = async (userId, active, status) => {
    setAdminMessage("");

    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(status ? { status } : { active })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setAdminMessage(data.message || "Could not update user");
        return;
      }

      setAdminMessage(status === "deleted" ? "User moved to Deleted" : status === "blocked" || active === false ? "User moved to Blocked" : "User enabled");
      await loadAdminUsers();
    } catch (error) {
      setAdminMessage("Could not connect to the server");
    }
  };

  const performAdminSalonAction = async (salonId, action, successMessage) => {
    setAdminMessage("");

    try {
      const res = await fetch(`${API_BASE}/admin/salons/${salonId}/${action}`, {
        method: "PATCH",
        headers: authHeaders()
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setAdminMessage(data.message || `Could not ${action} salon`);
        return;
      }

      setAdminMessage(data.message || successMessage);
      setAdminSalonConfirm(null);
      await loadAdminSalons();
      await loadAdminBookings();
      if (role === "customer") {
        await loadSalons();
      }
    } catch (error) {
      setAdminMessage("Could not connect to the server");
    }
  };

  const requestAdminSalonAction = (salon, action) => {
    const actionCopy = {
      block: {
        title: "Block this salon?",
        body: "Blocked salons will not appear to customers.",
        label: "Yes, block salon",
        message: "Salon blocked",
      },
      delete: {
        title: "Delete this salon?",
        body: "This is a soft delete. The salon will move to the Deleted tab and disappear from customer listings.",
        label: "Yes, delete salon",
        message: "Salon deleted",
      },
      reactivate: {
        title: "Reactivate this salon?",
        body: "The salon will move back to the Active tab. Customers will see it only if it is approved.",
        label: "Yes, reactivate salon",
        message: "Salon reactivated",
      },
    }[action];

    setAdminSalonConfirm({
      salonId: salon._id,
      action,
      salonName: salon.name,
      ...actionCopy,
    });
  };

  const cancelAdminBooking = async (bookingId, chargeCancellationFee = true) => {
    setAdminMessage("");

    try {
      const res = await fetch(`${API_BASE}/admin/bookings/${bookingId}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status: "cancelled", chargeCancellationFee })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setAdminMessage(data.message || "Could not cancel booking");
        return;
      }

      setAdminMessage(chargeCancellationFee ? "Booking cancelled with cancellation fee" : "Booking cancelled without cancellation fee");
      setAdminConfirm(null);
      await loadAdminBookings(adminFilters);
      await loadAdminEarnings(adminEarningsFilters);
    } catch (error) {
      setAdminMessage("Could not connect to the server");
    }
  };

  const updateAdminCancellationCharge = async (bookingId, charge) => {
    setAdminMessage("");

    try {
      const res = await fetch(`${API_BASE}/admin/bookings/${bookingId}/cancellation-charge`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ charge })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setAdminMessage(data.message || "Could not update cancellation charge");
        return;
      }

      setAdminMessage(charge ? "Cancellation fee charged" : "Cancellation fee waived");
      setAdminConfirm(null);
      await loadAdminBookings();
      await loadAdminEarnings(adminEarningsFilters);
    } catch (error) {
      setAdminMessage("Could not connect to the server");
    }
  };

  const requestAdminCancellationCharge = (booking, charge) => {
    setAdminConfirm({
      type: "charge",
      bookingId: booking._id,
      charge,
      title: charge ? "Charge cancellation fee?" : "Waive cancellation fee?",
      body: charge
        ? "Customer charge, admin commission, and service provider earning will use the stored booking rules."
        : "Customer charge, admin commission, and service provider earning will show as Rs. 0."
    });
  };

  const requestAdminCancelBooking = (booking) => {
    setAdminConfirm({
      type: "cancel",
      bookingId: booking._id,
      title: "Cancel this booking?",
      body: "Do you want to charge cancellation fee?",
    });
  };

  const changeAdminBookingTab = async (tab) => {
    setAdminBookingTab(tab);
    const nextFilters = { ...adminFilters, status: tab };
    setAdminFilters(nextFilters);
    await loadAdminBookings(nextFilters);
  };

  const requestClearBookings = (status) => {
    const nextFilters = { ...adminFilters, status };
    setAdminBookingTab(status);
    setAdminFilters(nextFilters);
    loadAdminBookings(nextFilters);
    setAdminClearText("");
    setAdminClearConfirm({
      status,
      requiredText: status === "completed" ? "CLEAR COMPLETED" : "CLEAR CANCELLED",
      title: status === "completed" ? "Clear completed bookings?" : "Clear cancelled bookings?"
    });
  };

  const clearBookingsByStatus = async () => {
    if (!adminClearConfirm) {
      return;
    }

    setAdminMessage("");
    const clearStatus = adminClearConfirm.status;

    try {
      const res = await fetch(`${API_BASE}/admin/bookings/clear-by-status`, {
        method: "DELETE",
        headers: authHeaders(),
        body: JSON.stringify({
          status: clearStatus,
          confirmText: adminClearText.trim().toUpperCase()
        })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setAdminMessage(data.message || "Could not clear bookings");
        return;
      }

      setAdminMessage(`${data.message || "Bookings cleared"} (${data.modified ?? 0} hidden)`);
      setAdminClearConfirm(null);
      setAdminClearText("");
      const nextFilters = { ...adminFilters, status: clearStatus };
      setAdminBookingTab(clearStatus);
      setAdminFilters(nextFilters);
      await loadAdminBookings(nextFilters);
    } catch (error) {
      setAdminMessage("Could not connect to the server");
    }
  };

  const saveBookingFeeSetting = async (event) => {
    event.preventDefault();
    setAdminMessage("");

    try {
      const res = await fetch(`${API_BASE}/admin/settings/payment-rules`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          booking_fee_percentage: Number(bookingFeeForm),
          cancellation_charge_percentage: Number(cancellationChargeForm),
          commission_percentage: Number(commissionForm)
        })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setAdminMessage(data.message || "Could not save booking fee");
        return;
      }

      setBookingFeeForm(String(data.booking_fee_percentage));
      setCancellationChargeForm(String(data.cancellation_charge_percentage));
      setCommissionForm(String(data.commission_percentage ?? 0));
      setBookingFeeExample(data.example);
      setAdminMessage("Payment rules updated");
      await loadAdminBusinessSummary();
    } catch (error) {
      setAdminMessage("Could not connect to the server");
    }
  };

  const pathname = window.location.pathname;

  if (pathname === "/return-policy") {
    return (
      <>
        {renderOfflineNotice()}
        <PolicyPage type="return" />
      </>
    );
  }

  if (pathname === "/privacy-policy") {
    return (
      <>
        {renderOfflineNotice()}
        <PolicyPage type="privacy" />
      </>
    );
  }

  if (!isLoggedIn) {
    return (
      <main style={styles.page}>
        {renderOfflineNotice()}
        <section style={styles.header}>
          <h1 style={styles.title}><Brand /></h1>
          <p style={styles.subtitle}>Login or create an account to book an appointment.</p>
        </section>

        <section style={styles.panel}>
          <InstallButton visible={Boolean(installPromptEvent)} onInstall={installApp} />
          <div style={styles.authTabs}>
            <button
              onClick={() => setAuthMode("login")}
              style={{ ...styles.tabButton, ...(authMode === "login" ? styles.activeTab : {}) }}
            >
              Login
            </button>
            <button
              onClick={() => setAuthMode("signup")}
              style={{ ...styles.tabButton, ...(authMode === "signup" ? styles.activeTab : {}) }}
            >
              Signup
            </button>
          </div>

          <form onSubmit={authMode === "login" ? login : signup}>
            {authMode === "signup" && (
              <>
                <label style={styles.label} htmlFor="name">Name</label>
                <input
                  id="name"
                  value={authForm.name}
                  onChange={(event) => updateAuthField("name", event.target.value)}
                  style={styles.input}
                />
              </>
            )}

            <label style={styles.label} htmlFor="phone">
              Mobile number
            </label>
            <input
              id="phone"
              type="tel"
              value={authForm.phone}
              onChange={(event) => updateAuthField("phone", event.target.value)}
              placeholder="+94771234567"
              style={styles.input}
            />

            {authMode === "signup" && (
              <>
                <label style={styles.label} htmlFor="email">Email optional</label>
                <input
                  id="email"
                  type="email"
                  value={authForm.email}
                  onChange={(event) => updateAuthField("email", event.target.value)}
                  style={styles.input}
                />
              </>
            )}

            <label style={styles.label} htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={authForm.password}
              onChange={(event) => updateAuthField("password", event.target.value)}
              style={styles.input}
            />

            {authMode === "signup" && (
              <>
                <label style={styles.label} htmlFor="role">Role</label>
                <select
                  id="role"
                  value={authForm.role}
                  onChange={(event) => updateAuthField("role", event.target.value)}
                  style={styles.input}
                >
                  <option value="customer">Customer</option>
                  <option value="barber">Service Provider</option>
                </select>

                {authForm.role === "barber" && (
                  <div style={styles.uploadBox}>
                    <label style={styles.label}>Select profession</label>
                    <select
                      value={authForm.professional_type}
                      onChange={(event) => updateAuthField("professional_type", event.target.value)}
                      style={styles.input}
                    >
                      <option value="barber">Barber</option>
                      <option value="beautician">Beautician</option>
                      <option value="makeup_artist">Makeup Artist</option>
                    </select>
                    <h3 style={styles.compactTitle}>Service Provider profile photo</h3>
                    {signupProfilePreview ? (
                      <img
                        src={signupProfilePreview}
                        alt="Profile preview"
                        style={styles.profilePhotoPreview}
                      />
                    ) : (
                      <div style={styles.profilePhotoPlaceholder}>Choose a profile photo</div>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleSignupProfilePhotoChange}
                      style={styles.input}
                    />
                  </div>
                )}
              </>
            )}

            <button type="submit" disabled={loading} style={styles.primaryButton}>
              {loading ? "Please wait..." : authMode === "login" ? "Login" : "Create account"}
            </button>
          </form>

          {message && <p style={styles.message}>{message}</p>}
        </section>
        <PolicyFooter />
      </main>
    );
  }

  if (role === "admin") {
    return (
      <main style={styles.pageWide}>
        {renderOfflineNotice()}
        <nav style={styles.navbar}>
          <Brand />
          <div style={styles.headerActions}>
            <InstallButton visible={Boolean(installPromptEvent)} onInstall={installApp} />
            {renderNotificationBell()}
            <button onClick={logout} style={styles.navButton}>Logout</button>
          </div>
        </nav>

        <section style={{ ...styles.hero, ...styles.adminHero }}>
          <h1 style={styles.titleWithIcon}><Icon name="admin" /> Admin Dashboard</h1>
          <p style={styles.heroSubtitle}>Manage users, salons, and bookings.</p>
        </section>

        <div style={styles.adminLayout}>
          <aside style={styles.sidebar}>
            {[
              ["profile", "Profile"],
              ["settings", "Payment Rules"],
              ["earnings", "Earnings"],
              ["users", "Users"],
              ["salons", "Salons"],
              ["products", "Cosmetics"],
              ["bookings", "Bookings"]
            ].map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => {
                  if (tab === "profile") {
                    hydrateProfileForm();
                    loadMyProfile();
                  }
                  setAdminTab(tab);
                }}
                style={{ ...styles.sidebarButton, ...(adminTab === tab ? styles.activeSidebarButton : {}) }}
              >
                <Icon
                  name={
                    tab === "settings"
                      ? "payments"
                      : tab === "earnings"
                        ? "earnings"
                        : tab === "profile"
                          ? "users"
                        : tab === "salons"
                          ? "salons"
                          : tab === "products"
                            ? "products"
                            : tab === "bookings"
                              ? "bookings"
                              : "admin"
                  }
                />
                {label}
              </button>
            ))}
          </aside>

          <section style={styles.panel}>
            {adminMessage && <p style={styles.message}>{adminMessage}</p>}
            {adminClearConfirm && (
              <div style={styles.modalBackdrop}>
                <section style={styles.modalCard}>
                  <div style={styles.confirmCard}>
                    <strong>{adminClearConfirm.title}</strong>
                    <span>This will remove selected booking records from active lists. Historical data may be hidden from normal views.</span>
                    <label style={styles.label}>Type {adminClearConfirm.requiredText}</label>
                    <input
                      value={adminClearText}
                      onChange={(event) => setAdminClearText(event.target.value.toUpperCase())}
                      style={styles.input}
                    />
                    <div style={styles.buttonRow}>
                      <button type="button" onClick={() => setAdminClearConfirm(null)} style={styles.smallButton}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={clearBookingsByStatus}
                        disabled={adminClearText.trim().toUpperCase() !== adminClearConfirm.requiredText}
                        style={styles.dangerButton}
                      >
                        Clear records
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            )}
            {adminConfirm && (
              <div style={styles.confirmCard}>
                <strong>{adminConfirm.title}</strong>
                <span>{adminConfirm.body}</span>
                {adminConfirm.type === "cancel" ? (
                  <div style={styles.buttonRow}>
                    <button type="button" onClick={() => setAdminConfirm(null)} style={styles.smallButton}>
                      Close
                    </button>
                    <button type="button" onClick={() => cancelAdminBooking(adminConfirm.bookingId, true)} style={styles.dangerButton}>
                      Cancel and Charge
                    </button>
                    <button type="button" onClick={() => cancelAdminBooking(adminConfirm.bookingId, false)} style={styles.smallButton}>
                      Cancel without Charge
                    </button>
                  </div>
                ) : (
                  <div style={styles.buttonRow}>
                    <button type="button" onClick={() => setAdminConfirm(null)} style={styles.smallButton}>
                      No, keep current setting
                    </button>
                    <button
                      type="button"
                      onClick={() => updateAdminCancellationCharge(adminConfirm.bookingId, adminConfirm.charge)}
                      style={adminConfirm.charge ? styles.smallButton : styles.dangerButton}
                    >
                      {adminConfirm.charge ? "Yes, charge fee" : "Yes, waive fee"}
                    </button>
                  </div>
                )}
              </div>
            )}
            {adminSalonConfirm && (
              <div style={styles.modalBackdrop}>
                <section style={styles.modalCard}>
                  <div style={styles.confirmCard}>
                    <strong>{adminSalonConfirm.title}</strong>
                    <span>{adminSalonConfirm.body}</span>
                    <span>Salon: {adminSalonConfirm.salonName}</span>
                    <div style={styles.buttonRow}>
                      <button type="button" onClick={() => setAdminSalonConfirm(null)} style={styles.smallButton}>
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => performAdminSalonAction(
                          adminSalonConfirm.salonId,
                          adminSalonConfirm.action,
                          adminSalonConfirm.message
                        )}
                        style={styles.dangerButton}
                      >
                        {adminSalonConfirm.label}
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {adminTab === "profile" && (
              <>
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitleWithIcon}><Icon name="users" /> Edit Profile</h2>
                  <button
                    type="button"
                    onClick={() => {
                      hydrateProfileForm();
                      loadMyProfile();
                    }}
                    style={styles.smallButton}
                  >
                    Refresh
                  </button>
                </div>
                {renderProfileEditor("Admin Profile")}
              </>
            )}

            {adminTab === "settings" && (
              <>
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitleWithIcon}><Icon name="payments" /> Payment Rules</h2>
                  <button onClick={loadBookingFeeSetting} style={styles.smallButton}>Refresh</button>
                </div>

                <form onSubmit={saveBookingFeeSetting}>
                  <label style={styles.label}>Booking fee % of service price</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={bookingFeeForm}
                    onChange={(event) => setBookingFeeForm(event.target.value)}
                    style={styles.input}
                  />
                  <label style={styles.label}>Cancellation charge % of service price</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={cancellationChargeForm}
                    onChange={(event) => setCancellationChargeForm(event.target.value)}
                    style={styles.input}
                  />
                  <label style={styles.label}>Platform commission % of service price</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={commissionForm}
                    onChange={(event) => setCommissionForm(event.target.value)}
                    style={styles.input}
                  />
                  <button type="submit" style={styles.primaryButton}>Save payment rules</button>
                </form>

                <div style={styles.successCard}>
                  <strong>Example Calculation</strong>
                  <span>Service price: Rs. 1000</span>
                  <span>Booking fee / advance: {bookingFeeForm || 0}% = Rs. {bookingFeeExample?.booking_fee_amount ?? 0}</span>
                  <span>Remaining pay at salon: Rs. {bookingFeeExample?.remaining_pay_at_salon ?? 1000}</span>
                  <span>Cancellation charge: {cancellationChargeForm || 0}% = Rs. {bookingFeeExample?.cancellation_charge_amount ?? 0}</span>
                  <span>Platform commission: {commissionForm || 0}% = Rs. {bookingFeeExample?.platform_commission_amount ?? 0}</span>
                  <span>Service provider earning from advance: Rs. {bookingFeeExample?.barber_earning_from_advance ?? bookingFeeExample?.barber_earning_amount ?? 0}</span>
                </div>

                <div style={styles.sectionHeader}>
                  <h3 style={styles.compactTitle}>Business Summary</h3>
                  <select
                    value={adminSummaryRange}
                    onChange={(event) => {
                      setAdminSummaryRange(event.target.value);
                      loadAdminBusinessSummary(event.target.value);
                    }}
                    style={styles.inputCompact}
                  >
                    <option value="today">Today</option>
                    <option value="this_week">This week</option>
                    <option value="this_month">This month</option>
                  </select>
                </div>
                {adminBusinessSummary && (
                  <div style={styles.insightGrid}>
                    <div style={styles.summaryCard}><strong>Revenue</strong><span>Rs. {adminBusinessSummary.total_revenue || 0}</span></div>
                    <div style={styles.summaryCard}><strong>Commission</strong><span>Rs. {adminBusinessSummary.total_commission_earned || 0}</span></div>
                    <div style={styles.summaryCard}><strong>Total bookings</strong><span>{adminBusinessSummary.total_bookings || 0}</span></div>
                    <div style={styles.summaryCard}><strong>Paid bookings</strong><span>{adminBusinessSummary.paid_bookings || 0}</span></div>
                    <div style={styles.summaryCard}><strong>Cancelled</strong><span>{adminBusinessSummary.cancelled_bookings || 0}</span></div>
                  </div>
                )}
              </>
            )}

            {adminTab === "earnings" && (
              <>
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitleWithIcon}><Icon name="earnings" /> Earnings Report</h2>
                  <button onClick={() => loadAdminEarnings(adminEarningsFilters)} style={styles.smallButton}>Refresh</button>
                </div>
                {renderEarningsFilters({
                  filters: adminEarningsFilters,
                  setFilters: setAdminEarningsFilters,
                  onApply: loadAdminEarnings,
                  report: adminEarnings,
                  csvPrefix: "admin",
                  includeBarber: true
                })}
                {adminEarnings?.summary && (
                  <div style={styles.insightGrid}>
                    <div style={styles.summaryCard}><strong>Service value</strong><span>Rs. {adminEarnings.summary.total_service_value}</span></div>
                    <div style={styles.summaryCard}><strong>Booking fees</strong><span>Rs. {adminEarnings.summary.total_booking_fees}</span></div>
                    <div style={styles.summaryCard}><strong>Cancellation charges</strong><span>Rs. {adminEarnings.summary.total_cancellation_charges}</span></div>
                    <div style={styles.summaryCard}><strong>Admin commission</strong><span>Rs. {adminEarnings.summary.total_admin_commission}</span></div>
                    <div style={styles.summaryCard}><strong>Service provider earnings</strong><span>Rs. {adminEarnings.summary.total_barber_earnings}</span></div>
                    <div style={styles.summaryCard}><strong>Total bookings</strong><span>{adminEarnings.summary.total_bookings}</span></div>
                  </div>
                )}
                {renderEarningsChart(adminEarnings)}
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Date</th>
                        <th style={styles.th}>Customer</th>
                        <th style={styles.th}>Service Provider</th>
                        <th style={styles.th}>Salon</th>
                        <th style={styles.th}>Service</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Service Price</th>
                        <th style={styles.th}>Admin Commission</th>
                        <th style={styles.th}>Service Provider Earning</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(adminEarnings?.items || []).map((item) => (
                        <tr key={item.booking_id}>
                          <td style={styles.td}>{item.date}</td>
                          <td style={styles.td}>{item.customer_name}</td>
                          <td style={styles.td}>{item.barber_name}</td>
                          <td style={styles.td}>{item.salon_name}</td>
                          <td style={styles.td}>{item.service_name}</td>
                          <td style={styles.td}>{item.status}</td>
                          <td style={styles.td}>Rs. {item.service_price}</td>
                          <td style={styles.td}>Rs. {item.admin_commission_amount}</td>
                          <td style={styles.td}>Rs. {item.barber_earning_amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {adminTab === "users" && (
              <>
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitleWithIcon}><Icon name="admin" /> Users Management</h2>
                  <button onClick={loadAdminUsers} style={styles.smallButton}>Refresh</button>
                </div>
                <div style={styles.tabRow}>
                  {[
                    ["active", "Active"],
                    ["blocked", "Blocked"],
                    ["deleted", "Deleted"]
                  ].map(([tab, label]) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setAdminUserTab(tab)}
                      style={{ ...styles.tabButton, ...(adminUserTab === tab ? styles.activeTab : {}) }}
                    >
                      {label} ({adminUserTabs[tab]?.length || 0})
                    </button>
                  ))}
                </div>

                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Name</th>
                        <th style={styles.th}>Phone</th>
                        <th style={styles.th}>Role</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(adminUserTabs[adminUserTab] || []).map((user) => (
                        <tr key={user._id}>
                          <td style={styles.td}>{user.name}</td>
                          <td style={styles.td}>{user.phone}</td>
                          <td style={styles.td}>{user.role}</td>
                          <td style={styles.td}>{user.status || (user.active === false ? "blocked" : "active")}</td>
                          <td style={styles.td}>
                            {user.role !== "admin" && (
                              <div style={styles.buttonRow}>
                                {user.status !== "active" && (
                                  <button onClick={() => updateAdminUser(user._id, true, "active")} style={styles.smallButton}>
                                    Restore active
                                  </button>
                                )}
                                {user.status !== "blocked" && user.status !== "deleted" && (
                                  <button onClick={() => updateAdminUser(user._id, false, "blocked")} style={styles.dangerButton}>
                                    Block
                                  </button>
                                )}
                                {user.status !== "deleted" && (
                                  <button onClick={() => updateAdminUser(user._id, false, "deleted")} style={styles.dangerButton}>
                                    Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {adminTab === "salons" && (
              <>
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitleWithIcon}><Icon name="salons" /> Salons Management</h2>
                  <button onClick={loadAdminSalons} style={styles.smallButton}>Refresh</button>
                </div>

                <div style={styles.tabRow}>
                  {[
                    ["active", "Active"],
                    ["blocked", "Blocked"],
                    ["deleted", "Deleted"]
                  ].map(([tab, label]) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setAdminSalonTab(tab)}
                      style={{ ...styles.tabButton, ...(adminSalonTab === tab ? styles.activeTab : {}) }}
                    >
                      {label} ({adminSalonTabs[tab]?.length || 0})
                    </button>
                  ))}
                </div>

                <div style={styles.list}>
                  {(adminSalonTabs[adminSalonTab] || []).map((salon) => (
                    <div key={salon._id} style={styles.listItem}>
                      {salon.board_photo_url ? (
                        <img
                          src={imageUrl(salon.board_photo_url)}
                          alt=""
                          style={getPositionedImageStyle(styles.salonPhoto, salon.imagePosition)}
                        />
                      ) : (
                        <div style={styles.salonPhotoPlaceholder}>No salon photo</div>
                      )}
                      <strong>{salon.name}</strong>
                      <span>{salon.address}</span>
                      <span>{ratingText(salon)}</span>
                      <span>Owner: {salon.owner_id?.name || salon.owner_id?.phone || "Unknown"}</span>
                      <span>Approval: {salon.approval_status || "pending"}</span>
                      <span>Active status: {salon.active === false ? "inactive" : "active"}</span>
                      <span>Management status: {salon.status || (salon.active === false ? "blocked" : "active")}</span>
                      <div style={styles.buttonRow}>
                        {adminSalonTab === "active" && (
                          <>
                            {(salon.approval_status || "pending") !== "approved" && (
                              <button
                                type="button"
                                onClick={() => performAdminSalonAction(salon._id, "approve", "Salon approved")}
                                style={styles.smallButton}
                              >
                                Approve
                              </button>
                            )}
                            {(salon.approval_status || "pending") !== "rejected" && (
                              <button
                                type="button"
                                onClick={() => performAdminSalonAction(salon._id, "reject", "Salon rejected")}
                                style={styles.dangerButton}
                              >
                                Reject
                              </button>
                            )}
                            <button type="button" onClick={() => requestAdminSalonAction(salon, "block")} style={styles.dangerButton}>
                              Block
                            </button>
                            <button type="button" onClick={() => requestAdminSalonAction(salon, "delete")} style={styles.dangerButton}>
                              Delete
                            </button>
                          </>
                        )}
                        {adminSalonTab === "blocked" && (
                          <>
                            <button
                              type="button"
                              onClick={() => performAdminSalonAction(salon._id, "unblock", "Salon unblocked")}
                              style={styles.smallButton}
                            >
                              Unblock
                            </button>
                            <button type="button" onClick={() => requestAdminSalonAction(salon, "delete")} style={styles.dangerButton}>
                              Delete
                            </button>
                          </>
                        )}
                        {adminSalonTab === "deleted" && (
                          <button type="button" onClick={() => requestAdminSalonAction(salon, "reactivate")} style={styles.smallButton}>
                            Reactivate
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {(adminSalonTabs[adminSalonTab] || []).length === 0 && (
                    <p style={styles.message}>No {adminSalonTab} salons</p>
                  )}
                </div>
              </>
            )}

            {adminTab === "products" && (
              <>
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitleWithIcon}><Icon name="products" /> Cosmetics Overview</h2>
                  <button onClick={() => { loadAdminProducts(); loadAdminProductOrders(); }} style={styles.smallButton}>Refresh</button>
                </div>

                <div style={styles.list}>
                  {adminProducts.length === 0 ? (
                    <p style={styles.message}>No cosmetics yet</p>
                  ) : adminProducts.map((product) => (
                    <div key={product._id} style={styles.listItem}>
                      {product.image ? (
                        <img
                          src={imageUrl(product.image)}
                          alt=""
                          style={getPositionedImageStyle(styles.salonPhoto, product.imagePosition)}
                        />
                      ) : (
                        <div style={styles.salonPhotoPlaceholder}>Cosmetic image</div>
                      )}
                      <strong>{product.name}</strong>
                      <span>{product.category || "General"}</span>
                      <span>Rs. {product.price}</span>
                      <span>Stock: {product.stock_quantity}</span>
                      <span>Service Provider: {product.barber_id?.name || product.barber_id?.phone || "Unknown"}</span>
                      <span>Salon: {product.salon_id?.name || "Not linked to a salon"}</span>
                      <span>Status: {product.active === false ? "Inactive" : "Active"}</span>
                      <div style={styles.buttonRow}>
                        <button
                          type="button"
                          onClick={() => toggleAdminProduct(product, product.active === false)}
                          style={product.active === false ? styles.smallButton : styles.dangerButton}
                        >
                          {product.active === false ? "Reactivate" : "Deactivate"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={styles.sectionHeader}>
                  <h3 style={styles.compactTitle}>Cosmetics Orders</h3>
                </div>
                <div style={styles.list}>
                  {adminProductOrders.length === 0 ? (
                    <p style={styles.message}>No cosmetics orders yet</p>
                  ) : adminProductOrders.map((order) => (
                    <div key={order._id} style={styles.listItem}>
                      <strong>{order.product_id?.name || "Cosmetic"}</strong>
                      <span>Customer: {order.customer_id?.name || order.customer_id?.phone || "Customer"}</span>
                      <span>Service Provider: {order.barber_id?.name || order.barber_id?.phone || "Service Provider"}</span>
                      <span>Salon: {order.salon_id?.name || "Not linked"}</span>
                      <span>Quantity: {order.quantity}</span>
                      <span>Total: Rs. {order.total_amount}</span>
                      <span>Created: {formatDateTime(order.createdAt)}</span>
                      <div style={styles.buttonRow}>
                        <StatusBadge status={order.status} />
                        <StatusBadge status={order.payment_status} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {adminTab === "bookings" && (
              <>
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitleWithIcon}><Icon name="bookings" /> Bookings Management</h2>
                  <button onClick={() => loadAdminBookings()} style={styles.smallButton}>Refresh</button>
                </div>
                <div style={styles.dangerZone}>
                  <strong>Danger Zone</strong>
                  <span>Clear old booking records from normal active lists by status.</span>
                  <div style={styles.buttonRow}>
                    <button type="button" onClick={() => requestClearBookings("completed")} style={styles.dangerButton}>
                      Clear Completed Bookings
                    </button>
                    <button type="button" onClick={() => requestClearBookings("cancelled")} style={styles.dangerButton}>
                      Clear Cancelled Bookings
                    </button>
                  </div>
                </div>

                <div style={styles.tabRow}>
                  {[
                    ["confirmed", "Confirmed"],
                    ["cancelled", "Cancelled"],
                    ["completed", "Completed"]
                  ].map(([tab, label]) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => changeAdminBookingTab(tab)}
                      style={{ ...styles.tabButton, ...(adminBookingTab === tab ? styles.activeTab : {}) }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div style={styles.adminBookingFilters}>
                  <input
                    type="date"
                    value={adminFilters.date}
                    onChange={(event) => setAdminFilters((current) => ({ ...current, date: event.target.value }))}
                    style={styles.input}
                  />
                  <select
                    value={adminFilters.salon_id}
                    onChange={(event) => setAdminFilters((current) => ({ ...current, salon_id: event.target.value }))}
                    style={styles.input}
                  >
                    <option value="">All salons</option>
                    {adminSalons.map((salon) => (
                      <option key={salon._id} value={salon._id}>{salon.name}</option>
                    ))}
                  </select>
                  <select
                    value={adminFilters.status}
                    onChange={(event) => {
                      const status = event.target.value;
                      setAdminFilters((current) => ({ ...current, status }));
                      setAdminBookingTab(status);
                    }}
                    style={styles.input}
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button onClick={() => loadAdminBookings(adminFilters)} style={styles.compactPrimaryButton}>
                    Apply filters
                  </button>
                </div>

                <div style={styles.list}>
                  {(adminBookingTabs[adminBookingTab] || []).map((booking) => (
                    <div key={booking._id} style={styles.listItem}>
                      <strong>{booking.salon_id?.name || booking.salon_id}</strong>
                      <span>{booking.service_id?.name || booking.service_id}</span>
                      <span>{booking.customer_id?.name || booking.customer_id?.phone || booking.customer_id}</span>
                      <span>{booking.date} | {booking.start_time} - {booking.end_time}</span>
                      <StatusBadge status={booking.status} />
                      <span>Service price: Rs. {booking.service_price ?? booking.total_amount ?? 0}</span>
                      {booking.status === "completed" && (
                        <>
                          <span>Admin commission: Rs. {booking.admin_commission_amount ?? booking.commission_amount ?? booking.platform_commission_amount ?? 0}</span>
                          <span>Service provider earning: Rs. {booking.barber_earning_amount ?? 0}</span>
                          <span>Payment: {booking.payment_status || "unpaid"}</span>
                        </>
                      )}
                      {booking.status === "cancelled" && (
                        <>
                          <span>Cancelled by: {roleLabel(booking.cancelled_by_role)}</span>
                          <span>Customer charged: Rs. {visibleCancellationCharge(booking)}</span>
                          <span>Admin commission: Rs. {visibleAdminCommission(booking)}</span>
                          <span>Service provider earning: Rs. {visibleBarberEarning(booking)}</span>
                          <span>{visibleCancellationCharge(booking) > 0 ? "Charged" : "Waived / no charge"}</span>
                        </>
                      )}
                      <div style={styles.buttonRow}>
                        {booking.status === "confirmed" && (
                          <button onClick={() => requestAdminCancelBooking(booking)} style={styles.dangerButton}>
                            Cancel
                          </button>
                        )}
                        {booking.status === "cancelled" && booking.cancelled_by_role !== "barber" && (
                          <button onClick={() => requestAdminCancellationCharge(booking, true)} style={styles.smallButton}>
                            Charge cancellation fee
                          </button>
                        )}
                        {booking.status === "cancelled" && (
                          <button onClick={() => requestAdminCancellationCharge(booking, false)} style={styles.dangerButton}>
                            Waive cancellation fee
                          </button>
                        )}
                        {booking.status === "cancelled" && booking.cancelled_by_role === "barber" && (
                          <span style={styles.salonText}>Barber-cancelled bookings are not charged</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {(adminBookingTabs[adminBookingTab] || []).length === 0 && (
                    <p style={styles.message}>No {adminBookingTab} bookings</p>
                  )}
                </div>
              </>
            )}

            {loading && <p style={styles.message}>Loading...</p>}
          </section>
        </div>
      </main>
    );
  }

  if (role === "barber") {
    const activeTabBookings = bookingTabs[barberBookingTab] || [];
    const modalNeedsSalon = ["service", "hours", "reserve", "photo"].includes(barberModal);

    return (
      <main style={styles.page}>
        {renderOfflineNotice()}
        <nav style={styles.navbar}>
          <Brand />
          <div style={styles.headerActions}>
          <InstallButton visible={Boolean(installPromptEvent)} onInstall={installApp} />
          {renderNotificationBell()}
          <div style={styles.avatarWrap}>
            <button
              type="button"
              onClick={() => setBarberMenuOpen((open) => !open)}
              style={{ ...styles.avatarButton, ...providerThemeStyles.avatarButton }}
              aria-label="Open service provider menu"
            >
              {currentUser?.profilePhotoUrl || currentUser?.profile_photo_url ? (
                <img src={imageUrl(currentUser.profilePhotoUrl || currentUser.profile_photo_url)} alt="" style={styles.avatarImage} />
              ) : (
                barberInitials
              )}
            </button>

            {barberMenuOpen && (
              <div style={styles.avatarMenu}>
                <button
                  type="button"
                  onClick={() => {
                    hydrateProfileForm();
                    loadMyProfile();
                    setBarberMainTab("profile");
                    setBarberMenuOpen(false);
                  }}
                  style={styles.menuItem}
                >
                  Profile
                </button>
                <button type="button" onClick={() => openBarberModal("salons")} style={styles.menuItem}>Manage salons</button>
                <button type="button" onClick={() => openBarberModal("service")} style={styles.menuItem}>Add service</button>
                <button
                  type="button"
                  onClick={() => {
                    setBarberMenuOpen(false);
                    resetProductForm();
                    setBarberMainTab("products");
                    loadBarberProducts();
                  }}
                  style={styles.menuItem}
                >
                  Cosmetics
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBarberMenuOpen(false);
                    setBarberMainTab("productOrders");
                    loadBarberProductOrders();
                  }}
                  style={styles.menuItem}
                >
                  Cosmetics Orders
                </button>
                <button type="button" onClick={() => openBarberModal("hours")} style={styles.menuItem}>Working hours</button>
                <button type="button" onClick={() => openBarberModal("reserve")} style={styles.menuItem}>Reserve time slot</button>
                <button type="button" onClick={() => openBarberModal("photo")} style={styles.menuItem}>Add/update salon board photo</button>
                <button type="button" onClick={logout} style={styles.menuItem}>Logout</button>
                <button
                  type="button"
                  onClick={() => {
                    setBarberMenuOpen(false);
                    requestDeactivateAccount();
                  }}
                  style={{ ...styles.menuItem, ...styles.menuDanger }}
                >
                  Deactivate account
                </button>
              </div>
            )}
          </div>
          </div>
        </nav>

        <section style={{ ...styles.hero, ...styles.barberHero, ...providerThemeStyles.hero }}>
          <h1 style={styles.titleWithIcon}><Icon name={providerIcon} /> Service Provider Dashboard</h1>
          <p style={styles.heroSubtitle}>
            {selectedBarberSalon ? `Managing ${selectedBarberSalon.name}` : "Select a salon to manage bookings and services."}
          </p>
          <div style={{ ...styles.topSalonBadge, ...styles.providerHeroBadge, ...providerThemeStyles.badge }}>
            Service Provider ({providerLabel})
          </div>
        </section>

        {barberNotice && (
          <div style={barberNotice.type === "success" ? styles.successNotice : styles.errorMessage}>
            {barberNotice.text}
          </div>
        )}

        {barberConfirm && (
          <section style={styles.confirmCard}>
            <strong>{barberConfirm.title}</strong>
            {barberConfirm.body && <span>{barberConfirm.body}</span>}
            <div style={styles.buttonRow}>
              <button type="button" onClick={() => setBarberConfirm(null)} disabled={loading} style={styles.smallButton}>
                No, keep it
              </button>
              <button type="button" onClick={confirmBarberAction} disabled={loading} style={styles.dangerButton}>
                {barberConfirm.confirmLabel}
              </button>
            </div>
          </section>
        )}

        <div style={styles.customerBottomNav}>
          <button
            type="button"
            onClick={() => setBarberMainTab("dashboard")}
            style={{ ...styles.tabButton, ...(barberMainTab === "dashboard" ? { ...styles.activeTab, ...providerThemeStyles.activeTab } : {}) }}
          >
            <Icon name={providerIcon} />
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => {
              setBarberMainTab("bookings");
              loadBarberAllBookings();
            }}
            style={{ ...styles.tabButton, ...(barberMainTab === "bookings" ? styles.activeTab : {}) }}
          >
            <Icon name="bookings" />
            Bookings
          </button>
          <button
            type="button"
            onClick={() => {
              hydrateProfileForm();
              loadMyProfile();
              setBarberMainTab("profile");
            }}
            style={{ ...styles.tabButton, ...(barberMainTab === "profile" ? styles.activeTab : {}) }}
          >
            <Icon name="users" />
            Profile
          </button>
          <button
            type="button"
            onClick={() => {
              resetProductForm();
              setBarberMainTab("products");
              loadBarberProducts();
            }}
            style={{ ...styles.tabButton, ...(barberMainTab === "products" ? styles.activeTab : {}) }}
          >
            <Icon name="products" />
            Cosmetics
          </button>
          <button
            type="button"
            onClick={() => {
              setBarberMainTab("productOrders");
              loadBarberProductOrders();
            }}
            style={{ ...styles.tabButton, ...(barberMainTab === "productOrders" ? styles.activeTab : {}) }}
          >
            <Icon name="products" />
            Cosmetics Orders
          </button>
        </div>

        {barberMainTab === "profile" && (
        <section style={styles.panel}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitleWithIcon}><Icon name="users" /> Edit Profile</h2>
            <button
              type="button"
              onClick={() => {
                hydrateProfileForm();
                loadMyProfile();
              }}
              style={styles.smallButton}
            >
              Refresh
            </button>
          </div>
          {renderProfileEditor(`Service Provider (${providerLabel})`)}
        </section>
        )}

        {barberMainTab === "dashboard" && (
        <section style={styles.panel}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitleWithIcon}><Icon name="earnings" /> Insights</h2>
            <button type="button" onClick={loadBarberInsights} style={styles.smallButton}>Refresh</button>
          </div>
          {barberInsights ? (
            <div style={styles.insightGrid}>
              <button type="button" onClick={() => loadBarberEarnings()} style={styles.clickableSummaryCard}>
                <strong>Today's Earnings</strong>
                <span>Rs. {barberInsights.today_earnings || 0}</span>
              </button>
              <div style={styles.summaryCard}><strong>Today's Bookings</strong><span>{barberInsights.today_booking_count || 0}</span></div>
              <div style={styles.summaryCard}><strong>This Week Bookings</strong><span>{barberInsights.this_week_booking_count || 0}</span></div>
              <div style={styles.summaryCard}><strong>Most Popular Service</strong><span>{barberInsights.most_popular_service || "No bookings yet"}</span></div>
              <div style={styles.summaryCard}><strong>Cancel Rate</strong><span>{barberInsights.cancel_rate_percentage || 0}%</span></div>
            </div>
          ) : (
            <p style={styles.message}>Insights will appear after bookings are available.</p>
          )}
        </section>
        )}

        {barberMainTab === "dashboard" && (
        <section style={styles.panel}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Today's bookings</h2>
            <button type="button" onClick={loadBarberAllBookings} style={styles.smallButton}>Refresh</button>
          </div>

          {todayBarberBookings.length === 0 ? (
            <p style={styles.message}>No bookings today</p>
          ) : (
            <div style={styles.compactList}>
              {todayBarberBookings.slice(0, 4).map((booking) => (
                <div key={booking._id} style={styles.summaryCard}>
                  <strong>{booking.start_time} - {booking.end_time}</strong>
                  <span>{booking.customer_id?.name || booking.customer_id?.phone || "Customer"}</span>
                  <span>{booking.service_id?.name || "Service"}</span>
                  <StatusBadge status={booking.status} />
                  {booking.status === "confirmed" && (
                    <div style={styles.buttonRow}>
                      <button type="button" onClick={() => completeBooking(booking._id)} style={styles.smallButton}>
                        Mark completed
                      </button>
                      <button type="button" onClick={() => requestCancelBarberBooking(booking)} style={styles.dangerButton}>
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
        )}

        {barberMainTab === "bookings" && (
        <section style={styles.panel}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Bookings</h2>
            <button type="button" onClick={loadBarberAllBookings} style={styles.smallButton}>Refresh</button>
          </div>
          <div style={styles.tabRow}>
            {[
              ["confirmed", "Confirmed"],
              ["cancelled", "Cancelled"],
              ["completed", "Completed"]
            ].map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setBarberBookingTab(tab)}
                style={{ ...styles.tabButton, ...(barberBookingTab === tab ? styles.activeTab : {}) }}
              >
                {label} ({bookingTabs[tab]?.length || 0})
              </button>
            ))}
          </div>

          {activeTabBookings.length === 0 ? (
            <p style={styles.message}>No {barberBookingTab} bookings</p>
          ) : (
            <div style={styles.list}>
              {activeTabBookings.map((booking) => (
                <div key={booking._id} style={styles.listItem}>
                  <strong>{booking.customer_id?.name || booking.customer_id?.phone || "Customer"}</strong>
                  <span>{booking.salon_id?.name || selectedBarberSalon?.name || "Salon"}</span>
                  <span>{booking.service_id?.name || "Service"}</span>
                  <span>{booking.date} | {booking.start_time} - {booking.end_time}</span>
                  <StatusBadge status={booking.status} />
                  {booking.status === "confirmed" && (
                    <>
                      <span>Advance: Rs. {booking.booking_fee_amount ?? booking.payment_amount ?? 0}</span>
                      <span>Remaining: Rs. {booking.remaining_pay_at_salon ?? 0}</span>
                    </>
                  )}
                  {booking.status === "completed" && (
                    <>
                      <span>Service price: Rs. {booking.service_price ?? booking.total_amount ?? 0}</span>
                      <span>Service Provider earned: Rs. {booking.barber_earning_amount ?? 0}</span>
                      <span>Admin commission deducted: Rs. {booking.admin_commission_amount ?? booking.commission_amount ?? booking.platform_commission_amount ?? 0}</span>
                    </>
                  )}
                  {barberCancellationDetails(booking)}
                  {booking.status === "confirmed" && (
                    <div style={styles.buttonRow}>
                      <button type="button" onClick={() => completeBooking(booking._id)} style={styles.smallButton}>
                        Mark completed
                      </button>
                      <button type="button" onClick={() => requestCancelBarberBooking(booking)} style={styles.dangerButton}>
                        Cancel booking
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
        )}

        {barberMainTab === "dashboard" && (
        <section style={styles.panel}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitleWithIcon}><Icon name="salons" /> Salon cards</h2>
            <button type="button" onClick={() => openBarberModal("salons")} style={styles.smallButton}>Manage</button>
          </div>

          {barberSalons.length === 0 ? (
            <p style={styles.message}>No salons yet. Use the menu to create your first salon.</p>
          ) : (
            <div className="salon-grid" style={styles.salonGrid}>
              {barberSalons.map((salon) => {
                const active = selectedBarberSalonId === salon._id;

                return (
                  <button
                    key={salon._id}
                    type="button"
                    onClick={() => selectBarberSalon(salon._id)}
                    style={{ ...styles.salonCard, ...(active ? styles.activeSalonCard : {}) }}
                  >
                    {salon.board_photo_url ? (
                      <img
                        src={imageUrl(salon.board_photo_url)}
                        alt=""
                        style={getPositionedImageStyle(styles.compactProductImage, salon.imagePosition)}
                      />
                    ) : (
                      <span style={styles.salonPhotoPlaceholder}>Salon board photo</span>
                    )}
                    <strong style={styles.salonName}>{salon.name}</strong>
                    <span style={styles.salonText}>{salon.address}</span>
                    <span style={styles.salonText}>{salon.phone}</span>
                    <span style={styles.ratingLine}><Icon name="ratings" /> {ratingText(salon)}</span>
                    <span style={styles.salonMeta}>
                      {salon.servicesCount || 0} services - {salon.bookingsCount || 0} bookings today
                    </span>
                    <span style={styles.salonMeta}>Approval: {salon.approval_status || "approved"}</span>
                    {salon.latest_comments?.[0]?.comment && (
                      <span style={styles.salonText}>Latest: "{salon.latest_comments[0].comment}"</span>
                    )}
                    {salon.active === false && <span style={styles.salonText}>Inactive</span>}
                  </button>
                );
              })}
            </div>
          )}
        </section>
        )}

        {barberMainTab === "dashboard" && (
        <section style={styles.panel}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitleWithIcon}><Icon name="services" /> {providerServicesTitle}</h2>
            <button type="button" onClick={() => openBarberModal("service")} style={styles.smallButton}>Manage services</button>
          </div>

          {!selectedBarberSalonId ? (
            <p style={styles.message}>Select a salon to view its services.</p>
          ) : barberServices.length === 0 ? (
            <p style={styles.message}>No services yet</p>
          ) : (
            <div style={styles.compactList}>
              {barberServices.slice(0, 5).map((service) => (
                <div key={service._id} style={styles.summaryCard}>
                  <strong>{service.name}</strong>
                  <span>Rs. {service.price} | {service.duration} min</span>
                  <span>{service.active === false ? "Inactive" : "Active"}</span>
                </div>
              ))}
            </div>
          )}
        </section>
        )}

        {barberMainTab === "products" && (
        <section style={styles.panel}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitleWithIcon}><Icon name="products" /> Cosmetics</h2>
            <button
              type="button"
              onClick={() => {
                resetProductForm();
                loadBarberProducts();
              }}
              style={styles.smallButton}
            >
              Refresh
            </button>
          </div>

          {barberProductMessage && (
            <p style={barberProductMessage === "Saved successfully" ? styles.successNotice : styles.message}>
              {barberProductMessage}
            </p>
          )}

          <form onSubmit={saveProduct} style={styles.uploadBox}>
            <h3 style={styles.compactTitle}>{editingProductId ? "Edit cosmetic" : "Add cosmetic"}</h3>
            <label style={styles.label}>Cosmetic name</label>
            <input value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} style={styles.input} />
            <label style={styles.label}>Brand</label>
            <input value={productForm.brand} onChange={(event) => setProductForm((current) => ({ ...current, brand: event.target.value }))} style={styles.input} />
            <label style={styles.label}>Category</label>
            <input value={productForm.category} onChange={(event) => setProductForm((current) => ({ ...current, category: event.target.value }))} style={styles.input} />
            <label style={styles.label}>Description</label>
            <textarea value={productForm.description} onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))} style={styles.input} rows={3} />
            <label style={styles.label}>Price</label>
            <input type="number" min="0" step="0.01" value={productForm.price} onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))} style={styles.input} />
            <label style={styles.label}>Stock quantity</label>
            <input type="number" min="0" step="1" value={productForm.stock_quantity} onChange={(event) => setProductForm((current) => ({ ...current, stock_quantity: event.target.value }))} style={styles.input} />
            <label style={styles.label}>Salon optional</label>
            <select value={productForm.salon_id} onChange={(event) => setProductForm((current) => ({ ...current, salon_id: event.target.value }))} style={styles.input}>
              <option value="">Not linked to a salon</option>
              {barberSalons.map((salon) => (
                <option key={salon._id} value={salon._id}>{salon.name}</option>
              ))}
            </select>
            <label style={styles.label}>Cosmetic image</label>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleProductImageChange} style={styles.input} />
            <ImagePositionEditor
              imageSrc={productPreviewSource}
              position={productImagePosition}
              onChange={setProductImagePosition}
              emptyLabel="Cosmetic image preview"
            />
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={productForm.active}
                onChange={(event) => setProductForm((current) => ({ ...current, active: event.target.checked }))}
              />
              Active
            </label>
            <div style={styles.buttonRow}>
              <button type="submit" disabled={loading} style={styles.primaryButton}>
                {editingProductId ? "Update cosmetic" : "Add cosmetic"}
              </button>
              {editingProductId && (
                <button type="button" onClick={resetProductForm} style={styles.smallButton}>
                  Cancel edit
                </button>
              )}
            </div>
          </form>

          <div style={styles.sectionHeader}>
            <h3 style={styles.compactTitle}>My cosmetics</h3>
          </div>
          {barberProducts.length === 0 ? (
            <p style={styles.message}>No cosmetics yet</p>
          ) : (
            <div className="cosmetic-grid" style={styles.cosmeticGrid}>
              {barberProducts.map((product) => (
                <div
                  key={product._id}
                  style={{
                    ...styles.productCard,
                    ...styles.compactCard,
                    ...(isProductUnavailable(product) ? styles.productCardUnavailable : {})
                  }}
                >
                  <div style={styles.productMediaWrap}>
                    <span style={{ ...styles.productBadge, ...productCategoryStyle(product.category) }}>
                      {productCategoryLabel(product.category)}
                    </span>
                    {product.image ? (
                      <img
                        src={imageUrl(product.image)}
                        alt=""
                        style={getPositionedImageStyle(styles.compactProductImage, product.imagePosition)}
                      />
                    ) : (
                      <div style={styles.salonPhotoPlaceholder}>Cosmetic image</div>
                    )}
                    {isProductUnavailable(product) && (
                      <div style={styles.productOverlayLabel}>Out of Stock</div>
                    )}
                  </div>
                  <div className="compact-card-body" style={styles.compactCardBody}>
                    <strong>{product.name}</strong>
                    <span style={styles.cardPrice}>Rs. {product.price}</span>
                    <span style={Number(product.stock_quantity) <= 0 ? styles.outOfStockText : undefined}>
                      {Number(product.stock_quantity) > 0 ? `Stock: ${product.stock_quantity}` : "Out of Stock"}
                    </span>
                    {Number(product.stock_quantity) > 0 && Number(product.stock_quantity) <= 5 && (
                      <span style={styles.lowStockText}>Only {product.stock_quantity} left</span>
                    )}
                    <span>{product.active === false ? "Inactive" : "Active"}</span>
                    <div style={styles.buttonRow}>
                      <button type="button" onClick={() => startEditProduct(product)} style={styles.smallButton}>Edit</button>
                      <button
                        type="button"
                      onClick={() => toggleProductActive(product, product.active === false)}
                      style={product.active === false ? styles.smallButton : styles.navButton}
                      >
                        {product.active === false ? "Activate" : "Deactivate"}
                      </button>
                      <button type="button" onClick={() => requestDeleteProduct(product)} style={styles.dangerButton}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </section>
        )}

        {barberMainTab === "productOrders" && (
        <section style={styles.panel}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitleWithIcon}><Icon name="products" /> Cosmetics Orders</h2>
            <button
              type="button"
              onClick={loadBarberProductOrders}
              style={styles.smallButton}
            >
              Refresh
            </button>
          </div>
          {barberProductOrders.length === 0 ? (
            <p style={styles.message}>No cosmetics orders yet</p>
          ) : (
            <div style={styles.list}>
              {barberProductOrders.map((order) => (
                <div key={order._id} style={styles.listItem}>
                  <strong>{order.product_id?.name || "Cosmetic"}</strong>
                  <span>Customer: {order.customer_id?.name || order.customer_id?.phone || "Customer"}</span>
                  <span>Customer phone: {order.customer_id?.phone || "No phone available"}</span>
                  <span>Quantity: {order.quantity}</span>
                  <span>Price: Rs. {order.unit_price ?? order.product_id?.price ?? 0}</span>
                  <span>Total: Rs. {order.total_amount}</span>
                  <span>Salon: {order.salon_id?.name || "Not linked"}</span>
                  <span>Pickup info: {order.salon_id?.address || order.salon_id?.phone || "Collect from service provider"}</span>
                  <span>Created: {formatDateTime(order.createdAt)}</span>
                  <div style={styles.buttonRow}>
                    <StatusBadge status={order.status} />
                    <StatusBadge status={order.payment_status} />
                  </div>
                  <div style={styles.buttonRow}>
                    {order.status === "pending" && (
                      <>
                        <button type="button" onClick={() => updateBarberProductOrder(order._id, "confirmed")} style={styles.smallButton}>Confirm</button>
                        <button type="button" onClick={() => updateBarberProductOrder(order._id, "cancelled")} style={styles.dangerButton}>Cancel</button>
                      </>
                    )}
                    {order.status === "confirmed" && (
                      <>
                        <button type="button" onClick={() => updateBarberProductOrder(order._id, "completed")} style={styles.smallButton}>Mark completed</button>
                        <button type="button" onClick={() => updateBarberProductOrder(order._id, "cancelled")} style={styles.dangerButton}>Cancel</button>
                      </>
                    )}
                    {order.payment_status === "unpaid" && order.status !== "cancelled" && (
                      <button type="button" onClick={() => updateBarberProductOrder(order._id, null, "paid")} style={styles.smallButton}>Mark paid</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        )}

        {barberModal && (
          <div style={styles.modalBackdrop}>
            <section style={styles.modalCard}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>
                  {barberModal === "profile" && "Profile"}
                  {barberModal === "salons" && "Manage salons"}
                  {barberModal === "service" && providerServicesTitle}
                  {barberModal === "hours" && "Working hours"}
                  {barberModal === "reserve" && "Reserve time slot"}
                  {barberModal === "photo" && "Salon board photo"}
                </h2>
                <button type="button" onClick={closeBarberModal} style={styles.smallButton}>Close</button>
              </div>

              {modalNeedsSalon && !selectedBarberSalonId && (
                <p style={styles.errorMessage}>Select a salon first.</p>
              )}

              {barberModal === "profile" && (
                renderProfileEditor(`Service Provider (${providerLabel})`)
              )}

              {barberModal === "salons" && (
                <>
                  <div style={styles.salonList}>
                    {barberSalons.map((salon) => (
                      <button
                        key={salon._id}
                        type="button"
                        onClick={() => selectBarberSalon(salon._id)}
                        style={{ ...styles.salonCard, ...(selectedBarberSalonId === salon._id ? styles.activeSalonCard : {}) }}
                      >
                        <strong style={styles.salonName}>{salon.name}</strong>
                        <span
                          style={{
                            ...styles.topSalonBadge,
                            ...providerTheme(salon.professional_type || "barber").badge
                          }}
                        >
                          {professionalTypeLabel(salon.professional_type || "barber")}
                        </span>
                        <span style={styles.salonText}>{salon.address}</span>
                        <span style={styles.salonText}>{salon.phone}</span>
                      </button>
                    ))}
                  </div>

                  <button type="button" onClick={startNewSalon} style={styles.smallButton}>Create new salon</button>
                  <form onSubmit={saveSalon}>
                    <label style={styles.label} htmlFor="salon-name-modal">Salon name</label>
                    <input id="salon-name-modal" value={salonForm.name} onChange={(event) => setSalonForm((current) => ({ ...current, name: event.target.value }))} style={styles.input} />

                    <label style={styles.label} htmlFor="salon-address-modal">Address / location</label>
                    <input id="salon-address-modal" value={salonForm.address} onChange={(event) => setSalonForm((current) => ({ ...current, address: event.target.value }))} style={styles.input} />

                    <label style={styles.label} htmlFor="salon-phone-modal">Phone</label>
                    <input id="salon-phone-modal" value={salonForm.phone} onChange={(event) => setSalonForm((current) => ({ ...current, phone: event.target.value }))} style={styles.input} />

                    <label style={styles.label}>Map location</label>
                    <button type="button" onClick={useCurrentSalonLocation} style={styles.smallButton}>Use my current location</button>

                    <label style={styles.label} htmlFor="salon-latitude-modal">Latitude</label>
                    <input id="salon-latitude-modal" type="number" step="any" value={salonForm.latitude} onChange={(event) => setSalonForm((current) => ({ ...current, latitude: event.target.value }))} style={styles.input} />

                    <label style={styles.label} htmlFor="salon-longitude-modal">Longitude</label>
                    <input id="salon-longitude-modal" type="number" step="any" value={salonForm.longitude} onChange={(event) => setSalonForm((current) => ({ ...current, longitude: event.target.value }))} style={styles.input} />

                    <button type="submit" disabled={loading} style={styles.primaryButton}>
                      {selectedBarberSalonId ? "Update salon" : "Create salon"}
                    </button>
                  </form>

                  {selectedBarberSalonId && (
                    <button type="button" onClick={requestDeleteSalon} disabled={loading} style={styles.dangerFullButton}>
                      Delete / Deactivate salon
                    </button>
                  )}
                </>
              )}

              {barberModal === "service" && selectedBarberSalonId && (
                <>
                  <form onSubmit={addService}>
                    <label style={styles.label} htmlFor="service-name-modal">Service name</label>
                    <input id="service-name-modal" value={serviceForm.name} onChange={(event) => setServiceForm((current) => ({ ...current, name: event.target.value }))} style={styles.input} />

                    <label style={styles.label} htmlFor="service-category-modal">Service category</label>
                    <select id="service-category-modal" value={serviceForm.service_category} onChange={(event) => setServiceForm((current) => ({ ...current, service_category: event.target.value }))} style={styles.input}>
                      <option value="hair">Hair</option>
                      <option value="beauty">Beauty</option>
                      <option value="makeup">Makeup</option>
                    </select>

                    <label style={styles.label} htmlFor="service-price-modal">Price</label>
                    <input id="service-price-modal" type="number" value={serviceForm.price} onChange={(event) => setServiceForm((current) => ({ ...current, price: event.target.value }))} style={styles.input} />

                    <label style={styles.label} htmlFor="service-duration-modal">Duration minutes</label>
                    <input id="service-duration-modal" type="number" value={serviceForm.duration} onChange={(event) => setServiceForm((current) => ({ ...current, duration: event.target.value }))} style={styles.input} />

                    <button type="submit" disabled={loading} style={styles.primaryButton}>Add service</button>
                  </form>

                  {barberSalons.filter((salon) => salon._id !== selectedBarberSalonId).length > 0 && (
                    <form onSubmit={copyServices} style={styles.uploadBox}>
                      <h3 style={styles.compactTitle}>Copy Services</h3>
                      <select value={copyFromSalonId} onChange={(event) => setCopyFromSalonId(event.target.value)} style={styles.input}>
                        <option value="">Choose source salon</option>
                        {barberSalons.filter((salon) => salon._id !== selectedBarberSalonId).map((salon) => (
                          <option key={salon._id} value={salon._id}>{salon.name}</option>
                        ))}
                      </select>
                      <button type="submit" disabled={loading || !copyFromSalonId} style={styles.primaryButton}>
                        Copy services to selected salon
                      </button>
                    </form>
                  )}

                  <div style={styles.list}>
                    {barberServices.map((service) => (
                      <div key={service._id} style={styles.listItem}>
                        {editingServiceId === service._id ? (
                          <form onSubmit={saveServiceEdit}>
                            <label style={styles.label}>Service name</label>
                            <input value={editServiceForm.name} onChange={(event) => setEditServiceForm((current) => ({ ...current, name: event.target.value }))} style={styles.input} />
                            <label style={styles.label}>Description</label>
                            <input value={editServiceForm.description} onChange={(event) => setEditServiceForm((current) => ({ ...current, description: event.target.value }))} style={styles.input} />
                            <label style={styles.label}>Service category</label>
                            <select value={editServiceForm.service_category} onChange={(event) => setEditServiceForm((current) => ({ ...current, service_category: event.target.value }))} style={styles.input}>
                              <option value="hair">Hair</option>
                              <option value="beauty">Beauty</option>
                              <option value="makeup">Makeup</option>
                            </select>
                            <label style={styles.label}>Price</label>
                            <input type="number" value={editServiceForm.price} onChange={(event) => setEditServiceForm((current) => ({ ...current, price: event.target.value }))} style={styles.input} />
                            <label style={styles.label}>Duration minutes</label>
                            <input type="number" value={editServiceForm.duration} onChange={(event) => setEditServiceForm((current) => ({ ...current, duration: event.target.value }))} style={styles.input} />
                            <label style={styles.checkboxLabel}>
                              <input type="checkbox" checked={editServiceForm.active} onChange={(event) => setEditServiceForm((current) => ({ ...current, active: event.target.checked }))} />
                              Active
                            </label>
                            <div style={styles.buttonRow}>
                              <button type="submit" disabled={loading} style={styles.smallButton}>Save</button>
                              <button type="button" onClick={() => setEditingServiceId("")} style={styles.smallButton}>Cancel</button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <strong>{service.name}</strong>
                            <span>{serviceCategoryLabel(service.service_category || "hair")}</span>
                            <span>{service.description || "No description"}</span>
                            <span>Rs. {service.price} | {service.duration} min</span>
                            <span>{service.active === false ? "Inactive" : "Active"}</span>
                            <div style={styles.buttonRow}>
                              <button type="button" onClick={() => startEditService(service)} style={styles.smallButton}>Edit</button>
                              <button type="button" onClick={() => requestDeleteService(service)} style={styles.dangerButton}>Delete</button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {barberModal === "hours" && selectedBarberSalonId && (
                <form onSubmit={saveWorkingHours}>
                  <label style={styles.label}>Working days</label>
                  <div style={styles.dayGrid}>
                    {[["Sun", 0], ["Mon", 1], ["Tue", 2], ["Wed", 3], ["Thu", 4], ["Fri", 5], ["Sat", 6]].map(([label, day]) => (
                      <label key={day} style={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={workingHoursForm.workingDays.includes(day)}
                          onChange={(event) => {
                            setWorkingHoursForm((current) => ({
                              ...current,
                              workingDays: event.target.checked
                                ? [...current.workingDays, day].sort()
                                : current.workingDays.filter((item) => item !== day)
                            }));
                          }}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <label style={styles.label}>Start time</label>
                  <input type="time" value={workingHoursForm.open} onChange={(event) => setWorkingHoursForm((current) => ({ ...current, open: event.target.value }))} style={styles.input} />
                  <label style={styles.label}>End time</label>
                  <input type="time" value={workingHoursForm.close} onChange={(event) => setWorkingHoursForm((current) => ({ ...current, close: event.target.value }))} style={styles.input} />
                  <label style={styles.label}>Slot interval minutes</label>
                  <input type="number" value={workingHoursForm.slotIntervalMinutes} onChange={(event) => setWorkingHoursForm((current) => ({ ...current, slotIntervalMinutes: event.target.value }))} style={styles.input} />
                  <button type="submit" disabled={loading} style={styles.primaryButton}>Save working hours</button>
                  {workingHoursMessage && <p style={styles.message}>{workingHoursMessage}</p>}
                </form>
              )}

              {barberModal === "reserve" && selectedBarberSalonId && (
                <>
                  <form onSubmit={reserveSlot}>
                    <label style={styles.label}>Date</label>
                    <input type="date" value={reserveForm.date} onChange={(event) => {
                      const nextDate = event.target.value;
                      setReserveForm((current) => ({ ...current, date: nextDate }));
                      loadReservedSlots(selectedBarberSalonId, nextDate);
                    }} style={styles.input} />
                    <label style={styles.label}>Start time</label>
                    <input type="time" value={reserveForm.start_time} onChange={(event) => setReserveForm((current) => ({ ...current, start_time: event.target.value }))} style={styles.input} />
                    <label style={styles.label}>End time</label>
                    <input type="time" value={reserveForm.end_time} onChange={(event) => setReserveForm((current) => ({ ...current, end_time: event.target.value }))} style={styles.input} />
                    <label style={styles.label}>Reason optional</label>
                    <input value={reserveForm.reason} onChange={(event) => setReserveForm((current) => ({ ...current, reason: event.target.value }))} placeholder="Lunch break" style={styles.input} />
                    <button type="submit" disabled={loading} style={styles.primaryButton}>Reserve Slot</button>
                  </form>
                  {reserveMessage && <p style={styles.message}>{reserveMessage}</p>}
                  <div style={styles.sectionHeader}>
                    <h3 style={styles.smallTitle}>Reserved slots</h3>
                    <button type="button" onClick={() => loadReservedSlots(selectedBarberSalonId, reserveForm.date)} style={styles.smallButton}>Refresh</button>
                  </div>
                  {reservedSlots.length === 0 ? (
                    <p style={styles.message}>No reserved slots for this date</p>
                  ) : (
                    <div style={styles.list}>
                      {reservedSlots.map((slot) => (
                        <div key={slot._id} style={styles.listItem}>
                          <strong>{slot.start_time} - {slot.end_time}</strong>
                          <span>{slot.reason || "Reserved"}</span>
                          <button type="button" onClick={() => requestCancelReservedSlot(slot._id)} style={styles.dangerButton}>Cancel</button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {barberModal === "photo" && selectedBarberSalonId && (
                <form onSubmit={uploadBoardPhoto} style={styles.uploadBox}>
                  <ImagePositionEditor
                    imageSrc={boardPhotoSource}
                    position={boardPhotoPosition}
                    onChange={setBoardPhotoPosition}
                    emptyLabel="No board photo uploaded"
                  />
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleBoardPhotoChange} style={styles.input} />
                  {boardPhotoMessage && <p style={styles.message}>{boardPhotoMessage}</p>}
                  <button type="submit" disabled={loading || (!boardPhotoFile && !selectedBarberSalon?.board_photo_url)} style={styles.primaryButton}>
                    Upload / update board photo
                  </button>
                </form>
              )}
            </section>
          </div>
        )}

        {barberEarningsOpen && (
          <div style={styles.modalBackdrop}>
            <section style={styles.modalCard}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitleWithIcon}><Icon name="earnings" /> Earnings History</h2>
                <button type="button" onClick={() => setBarberEarningsOpen(false)} style={styles.smallButton}>Close</button>
              </div>
              {renderEarningsFilters({
                filters: barberEarningsFilters,
                setFilters: setBarberEarningsFilters,
                onApply: loadBarberEarnings,
                report: barberEarnings,
                csvPrefix: "barber"
              })}
              {barberEarnings?.summary && (
                <div style={styles.insightGrid}>
                  <div style={styles.summaryCard}><strong>Total service value</strong><span>Rs. {barberEarnings.summary.total_service_value}</span></div>
                  <div style={styles.summaryCard}><strong>Booking fees</strong><span>Rs. {barberEarnings.summary.total_booking_fees}</span></div>
                  <div style={styles.summaryCard}><strong>Cancellation charges</strong><span>Rs. {barberEarnings.summary.total_cancellation_charges}</span></div>
                  <div style={styles.summaryCard}><strong>Admin commission</strong><span>Rs. {barberEarnings.summary.total_admin_commission}</span></div>
                  <div style={styles.summaryCard}><strong>Service provider earnings</strong><span>Rs. {barberEarnings.summary.total_barber_earnings}</span></div>
                  <div style={styles.summaryCard}><strong>Total bookings</strong><span>{barberEarnings.summary.total_bookings}</span></div>
                </div>
              )}
              {renderEarningsChart(barberEarnings)}
              {!barberEarnings?.items?.length ? (
                <p style={styles.message}>No earnings for this range</p>
              ) : (
                <div style={styles.list}>
                  {barberEarnings.items.map((item) => (
                    <div key={item._id} style={styles.listItem}>
                      <strong>{item.customer_name}</strong>
                      <span>{item.salon_name} - {item.service_name}</span>
                      <span>{item.date} | {item.start_time} - {item.end_time}</span>
                      <StatusBadge status={item.status} />
                      <span>Payment: <StatusBadge status={item.payment_status || "unpaid"} /></span>
                      <span>Service price: Rs. {item.service_price}</span>
                      <span>Booking fee: Rs. {item.booking_fee_amount}</span>
                      {Number(item.cancellation_charge_amount || 0) > 0 && (
                        <span>Cancellation charge: Rs. {item.cancellation_charge_amount}</span>
                      )}
                      <span>Admin commission: Rs. {item.admin_commission_amount}</span>
                      <span>Service provider earning: Rs. {item.barber_earning_amount}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {loading && <p style={styles.message}>Loading...</p>}
        {message && <p style={styles.message}>{message}</p>}
      </main>
    );
  }

  if (role === "barber" && false) {
    return (
      <main style={styles.page}>
        <nav style={styles.navbar}>
          <Brand />
          <div style={styles.buttonRow}>
            <button onClick={requestDeactivateAccount} style={styles.dangerButton}>Deactivate Account</button>
            <button onClick={logout} style={styles.navButton}>Logout</button>
          </div>
        </nav>

        <section style={styles.panel}>
          <h1 style={styles.titleWithIcon}><Icon name="barber" /> Service Provider Dashboard</h1>
          <p style={styles.subtitle}>Manage your salons, services, and today's appointments.</p>
        </section>

        {barberNotice && (
          <div style={barberNotice.type === "success" ? styles.successNotice : styles.errorMessage}>
            {barberNotice.text}
          </div>
        )}

        {barberConfirm && (
          <section style={styles.confirmCard}>
            <strong>{barberConfirm.title}</strong>
            {barberConfirm.body && <span>{barberConfirm.body}</span>}
            <div style={styles.buttonRow}>
              <button
                type="button"
                onClick={() => setBarberConfirm(null)}
                disabled={loading}
                style={styles.smallButton}
              >
                No, keep it
              </button>
              <button
                type="button"
                onClick={confirmBarberAction}
                disabled={loading}
                style={styles.dangerButton}
              >
                {barberConfirm.confirmLabel}
              </button>
            </div>
          </section>
        )}

        <section style={styles.panel}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitleWithIcon}><Icon name="salons" /> My Salons</h2>
            <button onClick={startNewSalon} style={styles.smallButton}>New salon</button>
          </div>

          {barberSalons.length === 0 ? (
            <p style={styles.message}>No salons yet. Create your first salon below.</p>
          ) : (
            <div style={styles.salonList}>
              {barberSalons.map((salon) => {
                const active = selectedBarberSalonId === salon._id;

                return (
                  <button
                    key={salon._id}
                    onClick={() => selectBarberSalon(salon._id)}
                    style={{
                      ...styles.salonCard,
                      ...(active ? styles.activeSalonCard : {})
                    }}
                  >
                    {salon.board_photo_url ? (
                      <img
                        src={imageUrl(salon.board_photo_url)}
                        alt=""
                        style={getPositionedImageStyle(styles.salonPhoto, salon.imagePosition)}
                      />
                    ) : (
                      <span style={styles.salonPhotoPlaceholder}>Salon board photo</span>
                    )}
                    <strong style={styles.salonName}>{salon.name}</strong>
                    <span style={styles.salonText}>{salon.address}</span>
                    <span style={styles.salonText}>{salon.phone}</span>
                    <span style={styles.salonMeta}>
                      {salon.servicesCount || 0} services - {salon.bookingsCount || 0} bookings today
                    </span>
                    {salon.active === false && <span style={styles.salonText}>Inactive</span>}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>
            {selectedBarberSalonId ? "Edit Salon Details" : "Create New Salon"}
          </h2>

          <form onSubmit={saveSalon}>
            <label style={styles.label} htmlFor="salon-name">Salon name</label>
            <input
              id="salon-name"
              value={salonForm.name}
              onChange={(event) => setSalonForm((current) => ({ ...current, name: event.target.value }))}
              style={styles.input}
            />

            <label style={styles.label} htmlFor="salon-address">Address / location</label>
            <input
              id="salon-address"
              value={salonForm.address}
              onChange={(event) => setSalonForm((current) => ({ ...current, address: event.target.value }))}
              style={styles.input}
            />

            <label style={styles.label} htmlFor="salon-phone">Phone</label>
            <input
              id="salon-phone"
              value={salonForm.phone}
              onChange={(event) => setSalonForm((current) => ({ ...current, phone: event.target.value }))}
              style={styles.input}
            />

            <label style={styles.label}>Map location</label>
            <button type="button" onClick={useCurrentSalonLocation} style={styles.smallButton}>
              Use my current location
            </button>

            <label style={styles.label} htmlFor="salon-latitude">Latitude</label>
            <input
              id="salon-latitude"
              type="number"
              step="any"
              value={salonForm.latitude}
              onChange={(event) => setSalonForm((current) => ({ ...current, latitude: event.target.value }))}
              style={styles.input}
            />

            <label style={styles.label} htmlFor="salon-longitude">Longitude</label>
            <input
              id="salon-longitude"
              type="number"
              step="any"
              value={salonForm.longitude}
              onChange={(event) => setSalonForm((current) => ({ ...current, longitude: event.target.value }))}
              style={styles.input}
            />

            <button type="submit" disabled={loading} style={styles.primaryButton}>
              {selectedBarberSalonId ? "Update salon" : "Create salon"}
            </button>
          </form>

          {selectedBarberSalonId && (
            <>
              <form onSubmit={uploadBoardPhoto} style={styles.uploadBox}>
                <h3 style={styles.compactTitle}>Salon Board Photo</h3>
                <ImagePositionEditor
                  imageSrc={boardPhotoSource}
                  position={boardPhotoPosition}
                  onChange={setBoardPhotoPosition}
                  emptyLabel="No board photo uploaded"
                />

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleBoardPhotoChange}
                  style={styles.input}
                />
                {boardPhotoMessage && <p style={styles.message}>{boardPhotoMessage}</p>}
                <button type="submit" disabled={loading || (!boardPhotoFile && !selectedBarberSalon?.board_photo_url)} style={styles.primaryButton}>
                  Upload / update board photo
                </button>
              </form>

              <button onClick={requestDeleteSalon} disabled={loading} style={styles.dangerFullButton}>
                Delete / Deactivate salon
              </button>
            </>
          )}
        </section>

        {selectedBarberSalonId ? (
          <>
            <section style={styles.panel}>
              <h2 style={styles.sectionTitle}>Working Hours</h2>
              <form onSubmit={saveWorkingHours}>
                <label style={styles.label}>Working days</label>
                <div style={styles.dayGrid}>
                  {[
                    ["Sun", 0],
                    ["Mon", 1],
                    ["Tue", 2],
                    ["Wed", 3],
                    ["Thu", 4],
                    ["Fri", 5],
                    ["Sat", 6]
                  ].map(([label, day]) => (
                    <label key={day} style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={workingHoursForm.workingDays.includes(day)}
                        onChange={(event) => {
                          setWorkingHoursForm((current) => ({
                            ...current,
                            workingDays: event.target.checked
                              ? [...current.workingDays, day].sort()
                              : current.workingDays.filter((item) => item !== day)
                          }));
                        }}
                      />
                      {label}
                    </label>
                  ))}
                </div>

                <label style={styles.label}>Start time</label>
                <input
                  type="time"
                  value={workingHoursForm.open}
                  onChange={(event) => setWorkingHoursForm((current) => ({ ...current, open: event.target.value }))}
                  style={styles.input}
                />

                <label style={styles.label}>End time</label>
                <input
                  type="time"
                  value={workingHoursForm.close}
                  onChange={(event) => setWorkingHoursForm((current) => ({ ...current, close: event.target.value }))}
                  style={styles.input}
                />

                <label style={styles.label}>Slot interval minutes</label>
                <input
                  type="number"
                  value={workingHoursForm.slotIntervalMinutes}
                  onChange={(event) => setWorkingHoursForm((current) => ({ ...current, slotIntervalMinutes: event.target.value }))}
                  style={styles.input}
                />

                <button type="submit" disabled={loading} style={styles.primaryButton}>
                  Save working hours
                </button>
              </form>
              {workingHoursMessage && <p style={styles.message}>{workingHoursMessage}</p>}
            </section>

            <section style={styles.panel}>
              <h2 style={styles.sectionTitle}>Reserve Time Slot</h2>
              <form onSubmit={reserveSlot}>
                <label style={styles.label}>Date</label>
                <input
                  type="date"
                  value={reserveForm.date}
                  onChange={(event) => {
                    const nextDate = event.target.value;
                    setReserveForm((current) => ({ ...current, date: nextDate }));
                    loadReservedSlots(selectedBarberSalonId, nextDate);
                  }}
                  style={styles.input}
                />

                <label style={styles.label}>Start time</label>
                <input
                  type="time"
                  value={reserveForm.start_time}
                  onChange={(event) => setReserveForm((current) => ({ ...current, start_time: event.target.value }))}
                  style={styles.input}
                />

                <label style={styles.label}>End time</label>
                <input
                  type="time"
                  value={reserveForm.end_time}
                  onChange={(event) => setReserveForm((current) => ({ ...current, end_time: event.target.value }))}
                  style={styles.input}
                />

                <label style={styles.label}>Reason optional</label>
                <input
                  value={reserveForm.reason}
                  onChange={(event) => setReserveForm((current) => ({ ...current, reason: event.target.value }))}
                  placeholder="Lunch break"
                  style={styles.input}
                />

                <button type="submit" disabled={loading} style={styles.primaryButton}>
                  Reserve Slot
                </button>
              </form>

              {reserveMessage && <p style={styles.message}>{reserveMessage}</p>}

              <div style={styles.sectionHeader}>
                <h3 style={styles.smallTitle}>Reserved slots</h3>
                <button
                  onClick={() => loadReservedSlots(selectedBarberSalonId, reserveForm.date)}
                  style={styles.smallButton}
                >
                  Refresh
                </button>
              </div>

              {reservedSlots.length === 0 ? (
                <p style={styles.message}>No reserved slots for this date</p>
              ) : (
                <div style={styles.list}>
                  {reservedSlots.map((slot) => (
                    <div key={slot._id} style={styles.listItem}>
                      <strong>{slot.start_time} - {slot.end_time}</strong>
                      <span>{slot.reason || "Reserved"}</span>
                      <button onClick={() => requestCancelReservedSlot(slot._id)} style={styles.dangerButton}>
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

        <section style={styles.panel}>
          <h2 style={styles.sectionTitleWithIcon}><Icon name="services" /> Add Services</h2>

          <form onSubmit={addService}>
            <label style={styles.label} htmlFor="service-name">Service name</label>
            <input
              id="service-name"
              value={serviceForm.name}
              onChange={(event) => setServiceForm((current) => ({ ...current, name: event.target.value }))}
              style={styles.input}
            />

            <label style={styles.label} htmlFor="service-category">Service category</label>
            <select
              id="service-category"
              value={serviceForm.service_category}
              onChange={(event) => setServiceForm((current) => ({ ...current, service_category: event.target.value }))}
              style={styles.input}
            >
              <option value="hair">Hair</option>
              <option value="beauty">Beauty</option>
              <option value="makeup">Makeup</option>
            </select>

            <label style={styles.label} htmlFor="service-price">Price</label>
            <input
              id="service-price"
              type="number"
              value={serviceForm.price}
              onChange={(event) => setServiceForm((current) => ({ ...current, price: event.target.value }))}
              style={styles.input}
            />

            <label style={styles.label} htmlFor="service-duration">Duration minutes</label>
            <input
              id="service-duration"
              type="number"
              value={serviceForm.duration}
              onChange={(event) => setServiceForm((current) => ({ ...current, duration: event.target.value }))}
              style={styles.input}
            />

            <button type="submit" disabled={loading} style={styles.primaryButton}>
              Add service
            </button>
          </form>
            </section>

            {barberSalons.filter((salon) => salon._id !== selectedBarberSalonId).length > 0 && (
              <section style={styles.panel}>
                <h2 style={styles.sectionTitle}>Copy Services</h2>
                <form onSubmit={copyServices}>
                  <label style={styles.label} htmlFor="copy-from-salon">
                    Copy from salon
                  </label>
                  <select
                    id="copy-from-salon"
                    value={copyFromSalonId}
                    onChange={(event) => setCopyFromSalonId(event.target.value)}
                    style={styles.input}
                  >
                    <option value="">Choose source salon</option>
                    {barberSalons
                      .filter((salon) => salon._id !== selectedBarberSalonId)
                      .map((salon) => (
                        <option key={salon._id} value={salon._id}>
                          {salon.name}
                        </option>
                      ))}
                  </select>
                  <button type="submit" disabled={loading || !copyFromSalonId} style={styles.primaryButton}>
                    Copy services to selected salon
                  </button>
                </form>
              </section>
            )}

            <section style={styles.panel}>
              <h2 style={styles.sectionTitleWithIcon}><Icon name="services" /> View Services</h2>

          {barberServices.length === 0 ? (
            <p style={styles.message}>No services yet</p>
          ) : (
            <div style={styles.list}>
              {barberServices.map((service) => (
                <div key={service._id} style={styles.listItem}>
                  {editingServiceId === service._id ? (
                    <form onSubmit={saveServiceEdit}>
                      <label style={styles.label}>Service name</label>
                      <input
                        value={editServiceForm.name}
                        onChange={(event) => setEditServiceForm((current) => ({ ...current, name: event.target.value }))}
                        style={styles.input}
                      />

                      <label style={styles.label}>Description</label>
                      <input
                        value={editServiceForm.description}
                        onChange={(event) => setEditServiceForm((current) => ({ ...current, description: event.target.value }))}
                        style={styles.input}
                      />

                      <label style={styles.label}>Price</label>
                      <input
                        type="number"
                        value={editServiceForm.price}
                        onChange={(event) => setEditServiceForm((current) => ({ ...current, price: event.target.value }))}
                        style={styles.input}
                      />

                      <label style={styles.label}>Duration minutes</label>
                      <input
                        type="number"
                        value={editServiceForm.duration}
                        onChange={(event) => setEditServiceForm((current) => ({ ...current, duration: event.target.value }))}
                        style={styles.input}
                      />

                      <label style={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={editServiceForm.active}
                          onChange={(event) => setEditServiceForm((current) => ({ ...current, active: event.target.checked }))}
                        />
                        Active
                      </label>

                      <div style={styles.buttonRow}>
                        <button type="submit" style={styles.smallButton}>Save</button>
                        <button type="button" onClick={() => setEditingServiceId("")} style={styles.smallButton}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <strong>{service.name}</strong>
                      <span>{service.description || "No description"}</span>
                      <span>Rs. {service.price}</span>
                      <span>{service.duration} min</span>
                      <span>{service.active === false ? "Inactive" : "Active"}</span>
                      <div style={styles.buttonRow}>
                        <button onClick={() => startEditService(service)} style={styles.smallButton}>Edit</button>
                        <button onClick={() => requestDeleteService(service)} style={styles.dangerButton}>Delete</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={styles.panel}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Today's Bookings</h2>
            <button
              onClick={() => loadTodayBookings(selectedBarberSalonId)}
              style={styles.smallButton}
            >
              Refresh
            </button>
          </div>

          {barberBookings.length === 0 ? (
            <p style={styles.message}>No bookings today</p>
          ) : (
            <div style={styles.list}>
              {barberBookings.map((booking) => {
                const customer = booking.customer_id;
                const service = booking.service_id;

                return (
                  <div key={booking._id} style={styles.listItem}>
                    <strong>{customer?.name || customer?._id || booking.customer_id}</strong>
                    <span>{service?.name || service?._id || booking.service_id}</span>
                    <span>{booking.date}</span>
                    <span>{booking.start_time} - {booking.end_time}</span>
                    <StatusBadge status={booking.status} />
                    <span>Payment: <StatusBadge status={booking.payment_status || "unpaid"} /></span>
                    <span>Service price: Rs. {booking.service_price ?? booking.total_amount ?? 0}</span>
                    <span>Advance paid: Rs. {booking.booking_fee_amount ?? booking.payment_amount ?? 0}</span>
                    <span>Remaining pay at salon: Rs. {booking.remaining_pay_at_salon ?? 0}</span>
                    {booking.status === "cancelled" && (
                      <span>Cancellation charge: Rs. {booking.cancellation_charge_amount ?? 0}</span>
                    )}
                    {booking.status === "confirmed" && (
                      <button onClick={() => completeBooking(booking._id)} style={styles.smallButton}>
                        Mark completed
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
          </>
        ) : (
          <section style={styles.panel}>
            <p style={styles.message}>Select a salon to manage services and bookings.</p>
          </section>
        )}

        {loading && <p style={styles.message}>Loading...</p>}
        {message && <p style={styles.message}>{message}</p>}
      </main>
    );
  }

  return (
    <main style={styles.page}>
      {renderOfflineNotice()}
      <nav style={styles.navbar}>
        <Brand />
        <div style={styles.headerActions}>
        <InstallButton visible={Boolean(installPromptEvent)} onInstall={installApp} />
        {renderNotificationBell()}
        <div style={styles.avatarWrap}>
          <button
            type="button"
            onClick={() => setCustomerMenuOpen((open) => !open)}
            style={styles.avatarButton}
            aria-label="Open customer menu"
          >
            {currentUser?.profilePhotoUrl || currentUser?.profile_photo_url ? (
              <img src={imageUrl(currentUser.profilePhotoUrl || currentUser.profile_photo_url)} alt="" style={styles.avatarImage} />
            ) : (
              customerInitials
            )}
          </button>

          {customerMenuOpen && (
            <div style={styles.avatarMenu}>
              <button
                type="button"
                onClick={() => {
                  hydrateProfileForm();
                  loadMyProfile();
                  setCustomerTab("profile");
                  setCustomerMenuOpen(false);
                }}
                style={styles.menuItem}
              >
                Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomerTab("appointments");
                  setCustomerMenuOpen(false);
                  loadCustomerBookings();
                }}
                style={styles.menuItem}
              >
                My Bookings
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomerTab("book");
                  setCustomerMenuOpen(false);
                }}
                style={styles.menuItem}
              >
                Book Appointment
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomerTab("shop");
                  setCustomerMenuOpen(false);
                  loadProducts();
                }}
                style={styles.menuItem}
              >
                Cosmetics Shop
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomerTab("productOrders");
                  setCustomerMenuOpen(false);
                  loadCustomerProductOrders();
                }}
                style={styles.menuItem}
              >
                My Cosmetics Orders
              </button>
              <button type="button" onClick={logout} style={styles.menuItem}>Logout</button>
              <button
                type="button"
                onClick={() => {
                  setCustomerMenuOpen(false);
                  requestDeactivateAccount();
                }}
                style={{ ...styles.menuItem, ...styles.menuDanger }}
              >
                Deactivate account
              </button>
            </div>
          )}
        </div>
        </div>
      </nav>

      <section style={{ ...styles.hero, ...styles.customerHero }}>
        <h1 style={styles.title}>Book an appointment</h1>
        <p style={styles.heroSubtitle}>Find a salon, choose a service, and book an available slot.</p>
      </section>

      {paymentNotice && <p style={styles.message}>{paymentNotice}</p>}

      <div style={styles.customerBottomNav}>
        <button
          type="button"
          onClick={() => setCustomerTab("book")}
          style={{ ...styles.tabButton, ...(customerTab === "book" ? styles.activeTab : {}) }}
        >
          <Icon name="booking" />
          Book Appointment
        </button>
        <button
          type="button"
          onClick={() => {
            setCustomerTab("appointments");
            loadCustomerBookings();
          }}
          style={{ ...styles.tabButton, ...(customerTab === "appointments" ? styles.activeTab : {}) }}
        >
          <Icon name="bookings" />
          My Bookings
        </button>
        <button
          type="button"
          onClick={() => {
            hydrateProfileForm();
            loadMyProfile();
            setCustomerTab("profile");
          }}
          style={{ ...styles.tabButton, ...(customerTab === "profile" ? styles.activeTab : {}) }}
        >
          <Icon name="users" />
          Profile
        </button>
        <button
          type="button"
          onClick={() => {
            setCustomerTab("shop");
            loadProducts();
          }}
          style={{ ...styles.tabButton, ...(customerTab === "shop" ? styles.activeTab : {}) }}
        >
          <Icon name="shop" />
          Cosmetics Shop
        </button>
        <button
          type="button"
          onClick={() => {
            setCustomerTab("productOrders");
            loadCustomerProductOrders();
          }}
          style={{ ...styles.tabButton, ...(customerTab === "productOrders" ? styles.activeTab : {}) }}
        >
          <Icon name="products" />
          My Cosmetics Orders
        </button>
      </div>

      {customerTab === "profile" && (
        <section style={{ ...styles.panel, ...styles.dashboardSection }}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitleWithIcon}><Icon name="users" /> Edit Profile</h2>
            <button
              type="button"
              onClick={() => {
                hydrateProfileForm();
                loadMyProfile();
              }}
              style={styles.smallButton}
            >
              Refresh
            </button>
          </div>
          {renderProfileEditor("Customer Profile")}
        </section>
      )}

      {customerTab === "book" && (
        <>
      <section style={{ ...styles.panel, ...styles.dashboardSection }}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitleWithIcon}><Icon name="salons" /> Discover salons</h2>
          {message && <div style={styles.errorCard}>{message}</div>}
        </div>

        <div style={styles.filterBar}>
          <div>
            <label style={styles.label} htmlFor="salon-search">Search salons</label>
            <input
              id="salon-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by salon name or location"
              style={styles.input}
            />
          </div>
          <div>
            <label style={styles.label} htmlFor="service-type-filter">Service Type</label>
            <select
              id="service-type-filter"
              value={customerServiceTypeFilter}
              onChange={(event) => setCustomerServiceTypeFilter(event.target.value)}
              style={styles.input}
            >
              <option value="all">All</option>
              <option value="barber">Barber</option>
              <option value="beautician">Beautician</option>
              <option value="makeup_artist">Makeup Artist</option>
            </select>
          </div>
          <div>
            <label style={styles.label} htmlFor="salon-sort">Sort salons</label>
            <select
              id="salon-sort"
              value={salonSort}
              onChange={(event) => setSalonSort(event.target.value)}
              style={styles.input}
            >
              <option value="top_rated">Highest Rated</option>
              <option value="most_reviewed">Most Reviewed</option>
              <option value="newest">Newest</option>
              <option value="nearest">Nearest</option>
            </select>
          </div>
          <div style={styles.filterActions}>
            <button type="button" onClick={loadNearbySalons} style={styles.smallButton}>Nearby Salons</button>
            <button type="button" onClick={clearSalonFilters} style={styles.smallButton}>Clear Filters</button>
          </div>
        </div>

        {loading && salons.length === 0 ? (
          <div className="salon-grid" style={styles.salonGrid}>
            {[1, 2, 3].map((item) => (
              <div key={item} style={{ ...styles.salonCard, ...styles.loadingCard }}>
                <div style={styles.salonPhotoPlaceholder}>Loading salon</div>
                <div style={styles.loadingLineWide} />
                <div style={styles.loadingLine} />
                <div style={styles.loadingLine} />
                <div style={styles.loadingLineShort} />
              </div>
            ))}
          </div>
        ) : filteredSalons.length === 0 ? (
          <div style={styles.emptyState}>
            <Icon name="salons" />
            <strong>No salons found</strong>
            <span>Try changing your search or filters.</span>
          </div>
        ) : (
          <div className="salon-grid" style={styles.salonGrid}>
            {filteredSalons.map((salon) => {
              const active = selectedSalon?._id === salon._id;

              return (
                <button
                  className="compact-card"
                  key={salon._id}
                  type="button"
                  onClick={() => selectSalon(salon)}
                  style={{
                    ...styles.salonCard,
                    ...(active ? styles.activeSalonCard : {})
                  }}
                >
                  <div style={styles.cardMediaWrap}>
                    {salon.board_photo_url ? (
                      <img
                        src={imageUrl(salon.board_photo_url)}
                        alt=""
                        className="compact-card-image"
                        style={getPositionedImageStyle(styles.salonPhotoLarge, salon.imagePosition)}
                      />
                    ) : (
                      <span style={styles.salonPhotoPlaceholder}>Salon cover image</span>
                    )}
                    {salon.distance_km != null && (
                      <span style={{ ...styles.badge, ...styles.distanceBadge }}>
                        {formatDistance(salon.distance_km)}
                      </span>
                    )}
                  </div>
                  <div className="compact-card-body" style={styles.compactCardBody}>
                    <div style={styles.cardHeaderRow}>
                      <strong style={styles.salonName}>{salon.name}</strong>
                      <span style={styles.ratingBadge}>{Number(salon.average_rating || 0).toFixed(1)}</span>
                    </div>
                    <span className="distance-pill" style={styles.salonText}>
                      {salon.distance_km != null ? formatDistance(salon.distance_km) : salon.address}
                    </span>
                    <span className="rating-stars" style={styles.ratingLine}>
                      {renderStars(salon.average_rating)}
                      {Number(salon.rating_count || 0) ? ` ${Number(salon.average_rating || 0).toFixed(1)}` : ""}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selectedSalon && (
        <section style={{ ...styles.panel, ...styles.dashboardSection }}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitleWithIcon}><Icon name="services" /> {selectedSalon.name} services</h2>
            <button type="button" onClick={() => setSalonDetailsOpen(true)} style={styles.smallButton}>
              View salon details
            </button>
          </div>

          <div style={styles.filterBar}>
            <div>
              <label style={styles.label} htmlFor="booking-date">Date</label>
              <input
                id="booking-date"
                type="date"
                value={date}
                onChange={handleDateChange}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.sectionHeader}>
            <h3 style={styles.compactTitle}>Services</h3>
          </div>
          {filteredServices.length === 0 ? (
            <div style={styles.emptyState}>
              <Icon name="services" />
              <strong>No services found</strong>
              <span>Try changing your search or filters.</span>
            </div>
          ) : (
            <div style={styles.gridList}>
              {filteredServices.map((service) => {
                const serviceFee = Number(
                  (Number(service.price || 0) * Number(paymentRules.booking_fee_percentage || 0) / 100).toFixed(2)
                );
                const activeService = selectedServiceId === service._id;

                return (
                  <button
                    key={service._id}
                    type="button"
                    onClick={() => chooseService(service._id)}
                    style={{
                      ...styles.serviceCard,
                      ...(activeService ? styles.activeSalonCard : {})
                    }}
                  >
                    <div style={styles.cardHeaderRow}>
                      <strong>{service.name}</strong>
                      <span style={{ ...styles.badge, ...productCategoryStyle(service.service_category || "hair") }}>
                        {serviceCategoryLabel(service.service_category || "hair")}
                      </span>
                    </div>
                    <span style={styles.salonText}>{service.duration} min</span>
                    <span style={styles.salonText}>Price: Rs. {service.price}</span>
                    <span style={styles.salonText}>Advance: Rs. {serviceFee}</span>
                    <span style={styles.bookNowPill}>Book</span>
                  </button>
                );
              })}
            </div>
          )}

          {selectedServicePayment && (
            <div style={styles.successCard}>
              <strong>Payment Summary</strong>
              <span>Service price: Rs. {selectedServicePayment.servicePrice}</span>
              <span>
                Advance / booking fee: Rs. {selectedServicePayment.bookingFeeAmount}
                {" "}({paymentRules.booking_fee_percentage || 0}%)
              </span>
              <span>Remaining pay at salon: Rs. {selectedServicePayment.remainingPayAtSalon}</span>
              <span>
                Cancellation charge: Rs. {selectedServicePayment.cancellationChargeAmount}
                {" "}({paymentRules.cancellation_charge_percentage || 0}% of full service price)
              </span>
            </div>
          )}

          {bookingError && <p style={styles.errorMessage}>{bookingError}</p>}

          {bookingSuccess && (
            <div style={styles.successCard}>
              <strong style={styles.successTitle}>Booking Confirmed</strong>
              <span>{bookingSuccess.salonName}</span>
              <span>{bookingSuccess.serviceName}</span>
              <span>{bookingSuccess.date}</span>
              <span>{bookingSuccess.start_time} - {bookingSuccess.end_time}</span>
              <StatusBadge status={bookingSuccess.status?.toLowerCase()} />
              <div style={styles.buttonRow}>
                <button
                  onClick={() => {
                    setCustomerTab("appointments");
                    loadCustomerBookings();
                  }}
                  style={styles.smallButton}
                >
                  View My Bookings
                </button>
                <button
                  onClick={() => {
                    setBookingSuccess(null);
                    setBookingError("");
                  }}
                  style={styles.smallButton}
                >
                  Book Another Appointment
                </button>
              </div>
            </div>
          )}

          <div style={styles.slotGrid}>
            {slots.map((slot) => {
              const past = isPastSlot(slot);
              const unavailable = slot.available === false;
              const disabled = past || unavailable;
              const label = past
                ? "Past"
                : unavailable
                  ? slot.reason === "reserved"
                    ? "Reserved"
                    : "Booked"
                  : "";

              return (
                <button
                  key={`${slot.start_time}-${slot.end_time}`}
                  onClick={() => {
                    if (!disabled) {
                      bookSlot(slot);
                    }
                  }}
                  disabled={disabled}
                  style={{
                    ...styles.slotButton,
                    ...(disabled ? styles.disabledSlotButton : {})
                  }}
                >
                  {slot.start_time} - {slot.end_time}
                  {label ? ` ${label}` : ""}
                </button>
              );
            })}
          </div>
        </section>
      )}
        </>
      )}

      <DetailsModal
        open={salonDetailsOpen && Boolean(selectedSalon)}
        title={selectedSalon?.name || "Salon details"}
        onClose={() => setSalonDetailsOpen(false)}
        wide
      >
        {selectedSalon && (
          <div style={styles.modalDetailsStack}>
            {selectedSalon.board_photo_url ? (
              <img
                src={imageUrl(selectedSalon.board_photo_url)}
                alt={`${selectedSalon.name} salon board`}
                style={getPositionedImageStyle(styles.modalHeroImage, selectedSalon.imagePosition)}
              />
            ) : (
              <div style={styles.boardPhotoPlaceholder}>No salon board photo yet</div>
            )}
            <div style={styles.reviewBox}>
              <strong>{"\u2B50"} {ratingText(selectedSalon)}</strong>
              <span>{selectedSalon.address}</span>
              <span>{selectedSalon.phone}</span>
              <span>{renderStars(selectedSalon.average_rating)}</span>
              <div style={styles.cardMetaRow}>
                <span style={styles.salonMeta}>Services: {selectedSalon.services_count || 0}</span>
                <span style={styles.salonMeta}>Bookings today: {selectedSalon.bookingsCount ?? 0}</span>
                <span style={styles.salonMeta}>
                  {String(selectedSalon.approval_status || "approved").replace("_", " ")}
                </span>
              </div>
              {selectedSalon.highest_rated_review?.comment && (
                <span>Highest rated: "{selectedSalon.highest_rated_review.comment}"</span>
              )}
              {selectedSalon.recent_reviews?.[0]?.comment && (
                <span>Most recent: "{selectedSalon.recent_reviews[0].comment}"</span>
              )}
            </div>
            <div style={styles.sectionHeader}>
              <h3 style={styles.compactTitle}>Available services</h3>
            </div>
            {filteredServices.length === 0 ? (
              <div style={styles.emptyState}>
                <Icon name="services" />
                <strong>No services found</strong>
                <span>Try changing your search or filters.</span>
              </div>
            ) : (
              <div className="grid-list" style={styles.serviceGrid}>
                {filteredServices.map((service) => {
                  const serviceFee = Number(
                    (Number(service.price || 0) * Number(paymentRules.booking_fee_percentage || 0) / 100).toFixed(2)
                  );
                  return (
                    <div key={service._id} className="service-card" style={styles.serviceCard}>
                      <div style={styles.cardHeaderRow}>
                        <strong>{service.name}</strong>
                        <span style={{ ...styles.badge, ...productCategoryStyle(service.service_category || "hair") }}>
                          {serviceCategoryLabel(service.service_category || "hair")}
                        </span>
                      </div>
                      <span style={styles.salonText}>{service.duration} min</span>
                      <span style={styles.salonText}>Price: Rs. {service.price}</span>
                      <span style={styles.salonText}>Advance: Rs. {serviceFee}</span>
                      <button
                        type="button"
                        onClick={() => {
                          chooseService(service._id);
                          setSalonDetailsOpen(false);
                        }}
                        style={styles.primaryButton}
                      >
                        Book / View Services
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </DetailsModal>

      {customerTab === "appointments" && (
        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>My Bookings</h2>

          {cancelBookingMessage && <p style={styles.message}>{cancelBookingMessage}</p>}

          {bookingToCancel && (
            <div style={styles.confirmCard}>
              <strong>Cancel this booking?</strong>
              <span>
                {bookingToCancel.date} at {bookingToCancel.start_time} - {bookingToCancel.end_time}
              </span>
              <div style={styles.buttonRow}>
                <button
                  onClick={() => setBookingToCancel(null)}
                  style={styles.smallButton}
                  disabled={loading}
                >
                  No, keep booking
                </button>
                <button
                  onClick={cancelBooking}
                  style={styles.dangerButton}
                  disabled={loading}
                >
                  Yes, cancel booking
                </button>
              </div>
            </div>
          )}

          {customerBookings.length === 0 ? (
            <p style={styles.message}>No bookings yet</p>
          ) : (
            <>
              <div style={styles.tabRow}>
                {[
                  ["confirmed", "Confirmed"],
                  ["cancelled", "Cancelled"],
                  ["completed", "Completed"]
                ].map(([tab, label]) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setCustomerBookingTab(tab)}
                    style={{ ...styles.tabButton, ...(customerBookingTab === tab ? styles.activeTab : {}) }}
                  >
                    {label} ({customerBookingTabs[tab]?.length || 0})
                  </button>
                ))}
              </div>

              {(customerBookingTabs[customerBookingTab] || []).length === 0 ? (
                <p style={styles.message}>No {customerBookingTab} bookings</p>
              ) : (
                <div style={styles.list}>
                  {(customerBookingTabs[customerBookingTab] || []).map((booking) => {
                const salon = booking.salon_id;
                const service = booking.service_id;

                return (
                  <div key={booking._id} style={styles.listItem}>
                    <strong>{salon?.name || salon?._id || booking.salon_id}</strong>
                    <span>{service?.name || service?._id || booking.service_id}</span>
                    <span>{booking.date}</span>
                    <span>{booking.start_time} - {booking.end_time}</span>
                    <StatusBadge status={booking.status} />
                    {booking.status === "confirmed" && (
                      <>
                        <span>Service price: Rs. {booking.service_price ?? booking.total_amount ?? service?.price ?? 0}</span>
                        <span>Booking fee / advance: Rs. {booking.booking_fee_amount ?? booking.payment_amount ?? 0}</span>
                        <span>Remaining pay at salon: Rs. {booking.remaining_pay_at_salon ?? 0}</span>
                      </>
                    )}
                    {booking.status === "completed" && (
                      <>
                        <span>Total service price: Rs. {booking.service_price ?? booking.total_amount ?? service?.price ?? 0}</span>
                        <span>Paid online / booking fee: Rs. {booking.booking_fee_amount ?? booking.payment_amount ?? 0}</span>
                        <span>Paid at salon / remaining: Rs. {booking.remaining_pay_at_salon ?? 0}</span>
                        <span>Payment status: <StatusBadge status={booking.payment_status || "unpaid"} /></span>
                      </>
                    )}
                    {customerCancellationDetails(booking)}
                    {booking.status === "completed" && (
                      booking.user_rating ? (
                        <span style={styles.ratingLine}><Icon name="ratings" /> Rated {booking.user_rating.rating}/5</span>
                      ) : (
                        <button type="button" onClick={() => openRatingModal(booking)} style={styles.smallButton}>
                          <Icon name="ratings" /> Rate salon
                        </button>
                      )
                    )}
                    {isFutureConfirmedBooking(booking) && (
                      <button onClick={() => askCancelBooking(booking)} style={styles.dangerButton}>
                        Cancel / Remove
                      </button>
                    )}
                  </div>
                );
                  })}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {customerTab === "shop" && (
        <section style={{ ...styles.panel, ...styles.dashboardSection }}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitleWithIcon}><Icon name="shop" /> Cosmetics Shop</h2>
            <button type="button" onClick={applyProductFilters} style={styles.smallButton}>Refresh</button>
          </div>
          {shopMessage && <div style={styles.errorCard}>{shopMessage}</div>}
          <div style={styles.filterBar}>
            <div>
              <label style={styles.label}>Search cosmetics</label>
              <input
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="Search by cosmetic name, brand, or category"
                style={styles.input}
              />
            </div>
            <div>
              <label style={styles.label}>Brand</label>
              <select
                value={productBrandFilter}
                onChange={(event) => setProductBrandFilter(event.target.value)}
                style={styles.input}
              >
                <option value="">All brands</option>
                {productBrandOptions.map((brand) => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={styles.label}>Salon</label>
              <select
                value={productSalonFilter}
                onChange={(event) => setProductSalonFilter(event.target.value)}
                style={styles.input}
              >
                <option value="">All salons</option>
                {shopSalonOptions.map((salon) => (
                  <option key={salon._id} value={salon._id}>{salon.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={styles.label}>Listing mode</label>
              <select
                value={productListingMode}
                onChange={(event) => setProductListingMode(event.target.value)}
                style={styles.input}
              >
                <option value="salon">Cosmetics by salon</option>
                <option value="nearby">Nearby cosmetics</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>Sort</label>
              <select
                value={productSort}
                onChange={(event) => setProductSort(event.target.value)}
                style={styles.input}
              >
                <option value="distance">Distance</option>
                <option value="price_low">Price low to high</option>
                <option value="price_high">Price high to low</option>
              </select>
            </div>
          </div>
          <div style={styles.filterActions}>
            <button type="button" onClick={applyProductFilters} style={styles.smallButton}>Apply filters</button>
            {productListingMode === "nearby" && (
              <button type="button" onClick={applyProductFilters} style={styles.smallButton}>Use my location</button>
            )}
            <button type="button" onClick={clearProductFilters} style={styles.smallButton}>Clear Filters</button>
          </div>
          {loading && customerProducts.length === 0 ? (
            <div style={styles.gridList}>
              {[1, 2, 3].map((item) => (
                <div key={item} style={{ ...styles.productCard, ...styles.loadingCard }}>
                  <div style={styles.salonPhotoPlaceholder}>Loading cosmetic</div>
                  <div style={styles.loadingLineWide} />
                  <div style={styles.loadingLine} />
                  <div style={styles.loadingLine} />
                </div>
              ))}
            </div>
          ) : filteredCustomerProducts.length === 0 ? (
            <div style={styles.emptyState}>
              <Icon name="shop" />
              <strong>No cosmetics found</strong>
              <span>Try changing your search or filters.</span>
            </div>
          ) : (
            <div className="cosmetic-grid" style={styles.cosmeticGrid}>
              {filteredCustomerProducts.map((product) => (
                <button
                  type="button"
                  key={product._id}
                  className="compact-card"
                  onClick={() => setSelectedCosmetic(product)}
                  style={{
                    ...styles.productCard,
                    ...styles.compactCard,
                    ...(isProductUnavailable(product) ? styles.productCardUnavailable : {})
                  }}
                >
                  <div style={styles.productMediaWrap}>
                    <span style={{ ...styles.productBadge, ...productCategoryStyle(product.category) }}>
                      {productCategoryLabel(product.category)}
                    </span>
                    {product.image ? (
                      <img
                        src={imageUrl(product.image)}
                        alt=""
                        className="compact-card-image"
                        style={getPositionedImageStyle(styles.compactProductImage, product.imagePosition)}
                      />
                    ) : (
                      <div style={styles.salonPhotoPlaceholder}>Cosmetic image</div>
                    )}
                    {isProductUnavailable(product) && (
                      <div style={styles.productOverlayLabel}>Out of Stock</div>
                    )}
                  </div>
                  <div className="compact-card-body" style={styles.compactCardBody}>
                    <strong>{product.name}</strong>
                    <span style={styles.cardPrice}>Rs. {product.price}</span>
                    {product.distance_km != null && (
                      <span className="distance-pill" style={{ ...styles.badge, background: "#eef4ff", color: "#1d4ed8" }}>
                        {formatDistance(product.distance_km)}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <DetailsModal
        open={Boolean(selectedCosmetic)}
        title={selectedCosmetic?.name || "Cosmetic details"}
        onClose={() => setSelectedCosmetic(null)}
      >
        {selectedCosmetic && (
          <div style={styles.modalDetailsStack}>
            <div style={styles.productMediaWrap}>
              <span style={{ ...styles.productBadge, ...productCategoryStyle(selectedCosmetic.category) }}>
                {productCategoryLabel(selectedCosmetic.category)}
              </span>
              {selectedCosmetic.image ? (
                <img
                  src={imageUrl(selectedCosmetic.image)}
                  alt=""
                  style={getPositionedImageStyle(styles.modalHeroImage, selectedCosmetic.imagePosition)}
                />
              ) : (
                <div style={styles.salonPhotoPlaceholder}>Cosmetic image</div>
              )}
              {isProductUnavailable(selectedCosmetic) && (
                <div style={styles.productOverlayLabel}>Out of Stock</div>
              )}
            </div>
            <div style={styles.list}>
              <strong style={styles.compactTitle}>{selectedCosmetic.name}</strong>
              <span style={styles.cardPrice}>Rs. {selectedCosmetic.price}</span>
              <span>Brand: {selectedCosmetic.brand || "Unbranded"}</span>
              <span>Salon: {selectedCosmetic.salon_id?.name || "Salon pickup"}</span>
              <span>
                Stock: {Number(selectedCosmetic.stock_quantity) > 0 ? selectedCosmetic.stock_quantity : "Out of Stock"}
              </span>
              {selectedCosmetic.distance_km != null && (
                <span>{formatDistance(selectedCosmetic.distance_km)}</span>
              )}
              <span>{selectedCosmetic.description || "Cosmetic"}</span>
              <div>
                <label style={styles.label}>Quantity</label>
                <input
                  type="number"
                  min="1"
                  max={selectedCosmetic.stock_quantity || 1}
                  value={productOrderQuantities[selectedCosmetic._id] || 1}
                  onChange={(event) => setProductOrderQuantities((current) => ({
                    ...current,
                    [selectedCosmetic._id]: event.target.value
                  }))}
                  style={styles.input}
                />
              </div>
              <button
                type="button"
                onClick={() => placeProductOrder(selectedCosmetic)}
                disabled={loading || isProductUnavailable(selectedCosmetic)}
                style={styles.primaryButton}
              >
                {isProductUnavailable(selectedCosmetic) ? "Unavailable" : "Order cosmetic for pickup"}
              </button>
            </div>
          </div>
        )}
      </DetailsModal>

      {customerTab === "productOrders" && (
        <section style={styles.panel}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitleWithIcon}><Icon name="products" /> My Cosmetics Orders</h2>
            <button type="button" onClick={loadCustomerProductOrders} style={styles.smallButton}>Refresh</button>
          </div>
          {shopMessage && <p style={styles.message}>{shopMessage}</p>}
          {customerProductOrders.length === 0 ? (
            <p style={styles.message}>No cosmetics orders yet</p>
          ) : (
            <div style={styles.list}>
              {customerProductOrders.map((order) => (
                <div key={order._id} style={styles.listItem}>
                  <strong>{order.product_id?.name || "Cosmetic"}</strong>
                  <span>Service Provider: {order.barber_id?.name || order.barber_id?.phone || "Service Provider"}</span>
                  <span>Salon: {order.salon_id?.name || "Not linked to a salon"}</span>
                  <span>Pickup info: {order.salon_id?.address || order.salon_id?.phone || "Collect from service provider"}</span>
                  <span>Quantity: {order.quantity}</span>
                  <span>Total: Rs. {order.total_amount}</span>
                  <span>Created: {formatDateTime(order.createdAt)}</span>
                  <div style={styles.buttonRow}>
                    <StatusBadge status={order.status} />
                    <StatusBadge status={order.payment_status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {ratingModalBooking && (
        <div style={styles.modalBackdrop}>
          <section style={styles.modalCard}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitleWithIcon}><Icon name="ratings" /> Rate salon</h2>
              <button type="button" onClick={() => setRatingModalBooking(null)} style={styles.smallButton}>Close</button>
            </div>
            <form onSubmit={submitRating}>
              <label style={styles.label}>Rating</label>
              <div style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRatingForm((current) => ({ ...current, rating: value }))}
                    style={value <= Number(ratingForm.rating) ? styles.starButtonActive : styles.starButton}
                  >
                    {"\u2605"}
                  </button>
                ))}
              </div>
              <label style={styles.label}>Comment optional</label>
              <textarea
                value={ratingForm.comment}
                onChange={(event) => setRatingForm((current) => ({ ...current, comment: event.target.value }))}
                style={styles.input}
                rows={3}
              />
              {ratingMessage && <p style={styles.message}>{ratingMessage}</p>}
              <button type="submit" disabled={loading} style={styles.primaryButton}>Submit rating</button>
            </form>
          </section>
        </div>
      )}

      {loading && <p style={styles.message}>Loading...</p>}
      {message && <p style={styles.message}>{message}</p>}
    </main>
  );
}

const styles = {
  page: {
    width: "100%",
    maxWidth: 760,
    margin: "0 auto",
    padding: "16px 14px 28px",
    fontFamily: "Arial, sans-serif",
    color: "#172026"
  },
  pageWide: {
    width: "100%",
    maxWidth: 1120,
    margin: "0 auto",
    padding: "16px 14px 28px",
    fontFamily: "Arial, sans-serif",
    color: "#172026"
  },
  navbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 16
  },
  brand: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    fontWeight: 800,
    color: "#0f3f3a"
  },
  brandLogo: {
    width: 34,
    height: 34,
    borderRadius: 10,
    boxShadow: "0 6px 16px rgba(15, 118, 110, 0.18)"
  },
  brandLink: {
    color: "inherit",
    textDecoration: "none"
  },
  policyFooter: {
    display: "grid",
    justifyItems: "center",
    gap: 14,
    marginTop: 18,
    padding: "14px 0",
    color: "#52606d",
    fontSize: 14
  },
  policyFooterLinks: {
    display: "flex",
    justifyContent: "center",
    gap: 18,
    flexWrap: "wrap"
  },
  policyBusiness: {
    display: "grid",
    justifyItems: "center",
    gap: 8,
    color: "#0f3f3a",
    fontWeight: 800,
    textAlign: "center"
  },
  policyLogo: {
    width: 74,
    height: 74,
    objectFit: "contain",
    borderRadius: "50%",
    background: "#ffffff"
  },
  footerLink: {
    color: "#0f766e",
    fontWeight: 700,
    textDecoration: "none"
  },
  policyCard: {
    display: "grid",
    gap: 12,
    border: "1px solid #d9e1e8",
    borderRadius: 8,
    padding: 18,
    background: "rgba(255, 255, 255, 0.98)",
    boxShadow: "0 10px 26px rgba(23, 32, 38, 0.05)"
  },
  policyContent: {
    display: "grid",
    gap: 10,
    lineHeight: 1.55,
    color: "#344054"
  },
  policyList: {
    margin: "0 0 0 18px",
    padding: 0,
    lineHeight: 1.7,
    color: "#344054"
  },
  contactBox: {
    display: "grid",
    gap: 5,
    marginTop: 8,
    padding: 12,
    border: "1px solid #9ed8c7",
    borderRadius: 8,
    background: "#effaf5",
    color: "#173b32"
  },
  navButton: {
    padding: "10px 14px",
    border: "1px solid #0f766e",
    borderRadius: 6,
    background: "#ffffff",
    color: "#0f766e",
    fontWeight: 700,
    cursor: "pointer"
  },
  installButton: {
    minHeight: 42,
    padding: "10px 14px",
    border: "1px solid #0f172a",
    borderRadius: 999,
    background: "#0f172a",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer"
  },
  offlineBanner: {
    marginBottom: 12,
    padding: "10px 12px",
    border: "1px solid #fed7aa",
    borderRadius: 8,
    background: "#fff7ed",
    color: "#9a3412",
    lineHeight: 1.45
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginLeft: "auto"
  },
  notificationWrap: {
    position: "relative"
  },
  notificationButton: {
    position: "relative",
    display: "grid",
    placeItems: "center",
    width: 42,
    height: 42,
    border: "1px solid #0f766e",
    borderRadius: "50%",
    background: "#ffffff",
    color: "#0f766e",
    cursor: "pointer"
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    padding: "0 5px",
    borderRadius: 999,
    background: "#b42318",
    color: "#ffffff",
    fontSize: 11,
    fontWeight: 800,
    lineHeight: "18px",
    textAlign: "center"
  },
  notificationPanel: {
    position: "absolute",
    right: 0,
    top: 50,
    zIndex: 25,
    width: 320,
    maxWidth: "calc(100vw - 28px)",
    display: "grid",
    gap: 8,
    padding: 10,
    border: "1px solid #d9e1e8",
    borderRadius: 8,
    background: "#ffffff",
    boxShadow: "0 16px 36px rgba(23, 32, 38, 0.16)"
  },
  notificationItem: {
    display: "grid",
    gap: 3,
    padding: 10,
    border: "1px solid #edf1f5",
    borderRadius: 8,
    background: "#ffffff",
    color: "#172026"
  },
  unreadNotificationItem: {
    borderColor: "#9ed8c7",
    background: "#effaf5"
  },
  header: {
    marginBottom: 16
  },
  title: {
    margin: "0 0 6px",
    fontSize: 28
  },
  titleWithIcon: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    margin: "0 0 6px",
    fontSize: 28
  },
  subtitle: {
    margin: 0,
    color: "#5c6670",
    lineHeight: 1.4
  },
  heroSubtitle: {
    margin: 0,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 1.4
  },
  panel: {
    border: "1px solid #d9e1e8",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    background: "rgba(255, 255, 255, 0.96)",
    boxShadow: "0 10px 26px rgba(23, 32, 38, 0.05)"
  },
  hero: {
    borderRadius: 12,
    padding: 22,
    marginBottom: 16,
    minHeight: 220,
    color: "#ffffff",
    backgroundSize: "cover",
    backgroundPosition: "center",
    boxShadow: "0 16px 34px rgba(23, 32, 38, 0.16)"
  },
  customerHero: {
    backgroundImage: "linear-gradient(90deg, rgba(15, 118, 110, 0.88), rgba(15, 118, 110, 0.18)), url('/assets/customer-hero-photo.png')"
  },
  barberHero: {
    backgroundImage: "linear-gradient(90deg, rgba(18, 52, 59, 0.9), rgba(15, 118, 110, 0.18)), url('/assets/barber-hero-photo.png')"
  },
  adminHero: {
    backgroundImage: "linear-gradient(90deg, rgba(38, 50, 56, 0.9), rgba(45, 106, 122, 0.48)), url('/assets/admin-hero.svg')"
  },
  adminLayout: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 16,
    alignItems: "start"
  },
  sidebar: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 8,
    border: "1px solid #d9e1e8",
    borderRadius: 8,
    padding: 10,
    background: "#ffffff"
  },
  sidebarButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: 10,
    border: "1px solid #c7d0d9",
    borderRadius: 6,
    background: "#ffffff",
    textAlign: "left",
    cursor: "pointer",
    fontWeight: 700
  },
  activeSidebarButton: {
    borderColor: "#0f766e",
    background: "#eefaf8",
    color: "#0f766e"
  },
  authTabs: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    marginBottom: 10
  },
  tabButton: {
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    padding: 12,
    border: "1px solid #c7d0d9",
    borderRadius: 6,
    background: "#ffffff",
    cursor: "pointer",
    fontWeight: 700
  },
  customerBottomNav: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 8,
    margin: "0 0 16px",
    padding: 8,
    border: "1px solid #d9e1e8",
    borderRadius: 8,
    background: "rgba(255, 255, 255, 0.96)",
    boxShadow: "0 10px 28px rgba(23, 32, 38, 0.08)"
  },
  avatarWrap: {
    position: "relative",
    marginLeft: "auto"
  },
  avatarButton: {
    display: "grid",
    placeItems: "center",
    width: 44,
    height: 44,
    border: "1px solid #0f766e",
    borderRadius: "50%",
    background: "#eefaf8",
    color: "#0f766e",
    fontWeight: 800,
    cursor: "pointer",
    overflow: "hidden"
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover"
  },
  avatarMenu: {
    position: "absolute",
    right: 0,
    top: 52,
    zIndex: 20,
    display: "grid",
    gap: 4,
    width: 240,
    padding: 8,
    border: "1px solid #d9e1e8",
    borderRadius: 8,
    background: "#ffffff",
    boxShadow: "0 16px 36px rgba(23, 32, 38, 0.16)"
  },
  menuItem: {
    width: "100%",
    minHeight: 40,
    padding: "9px 10px",
    border: 0,
    borderRadius: 6,
    background: "#ffffff",
    color: "#172026",
    textAlign: "left",
    cursor: "pointer",
    fontWeight: 700
  },
  menuDanger: {
    color: "#b42318",
    background: "#fff4f2"
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 30,
    padding: 14,
    overflowY: "auto",
    background: "rgba(15, 23, 42, 0.38)"
  },
  modalCard: {
    width: "100%",
    maxWidth: 720,
    margin: "24px auto",
    padding: 16,
    borderRadius: 8,
    border: "1px solid #d9e1e8",
    background: "#ffffff",
    boxShadow: "0 18px 42px rgba(23, 32, 38, 0.22)"
  },
  wideModalCard: {
    maxWidth: 880
  },
  activeTab: {
    borderColor: "#0f766e",
    background: "#eefaf8",
    color: "#0f766e"
  },
  label: {
    display: "block",
    margin: "12px 0 6px",
    fontWeight: 700
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: 12,
    border: "1px solid #c7d0d9",
    borderRadius: 6,
    fontSize: 16,
    background: "#ffffff"
  },
  inputCompact: {
    minWidth: 160,
    padding: 10,
    border: "1px solid #c7d0d9",
    borderRadius: 6,
    fontSize: 15,
    background: "#ffffff"
  },
  primaryButton: {
    width: "100%",
    marginTop: 16,
    minHeight: 48,
    padding: 12,
    border: "1px solid #0f766e",
    borderRadius: 6,
    background: "#0f766e",
    color: "#ffffff",
    fontSize: 16,
    cursor: "pointer"
  },
  compactPrimaryButton: {
    width: "100%",
    minHeight: 44,
    padding: "10px 12px",
    border: "1px solid #0f766e",
    borderRadius: 6,
    background: "#0f766e",
    color: "#ffffff",
    fontSize: 15,
    cursor: "pointer"
  },
  salonList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 14,
    marginTop: 12
  },
  salonGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 14,
    marginTop: 12
  },
  productGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 14,
    marginTop: 12
  },
  cosmeticGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 14,
    marginTop: 12
  },
  dashboardSection: {
    display: "grid",
    gap: 16,
    borderRadius: 14,
    padding: 18,
    background: "linear-gradient(180deg, rgba(255,255,255,0.99), rgba(245,250,251,0.96))",
    boxShadow: "0 18px 40px rgba(15, 63, 58, 0.08)"
  },
  filterBar: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 12,
    alignItems: "end",
    padding: 14,
    border: "1px solid #dbe7ea",
    borderRadius: 12,
    background: "#f8fbfc"
  },
  filterActions: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(140px, 1fr))",
    gap: 10,
    alignSelf: "end"
  },
  gridList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 14
  },
  serviceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14
  },
  salonCard: {
    position: "relative",
    display: "grid",
    alignContent: "start",
    gap: 10,
    width: "100%",
    minWidth: 0,
    padding: 0,
    textAlign: "left",
    border: "1px solid #d9e1e8",
    borderRadius: 18,
    background: "#ffffff",
    cursor: "pointer",
    overflow: "hidden",
    boxShadow: "0 16px 32px rgba(15, 63, 58, 0.08)",
    transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease"
  },
  activeSalonCard: {
    borderColor: "#0f766e",
    background: "#f4fcfa",
    boxShadow: "0 20px 38px rgba(15, 118, 110, 0.16)"
  },
  cardMediaWrap: {
    position: "relative",
    minHeight: 190,
    background: "#dfe9ec"
  },
  compactCard: {
    padding: 0,
    textAlign: "left",
    overflow: "hidden",
    cursor: "pointer"
  },
  compactCardBody: {
    display: "grid",
    gap: 8,
    padding: "12px 14px 14px"
  },
  salonPhotoLarge: {
    width: "100%",
    height: 190,
    objectFit: "cover",
    display: "block",
    background: "#dfe9ec"
  },
  salonPhoto: {
    width: "100%",
    height: 130,
    objectFit: "cover",
    borderRadius: 6,
    marginBottom: 6,
    background: "#e8eef2"
  },
  compactProductImage: {
    width: "100%",
    height: 190,
    display: "block",
    background: "#dfe9ec"
  },
  salonPhotoPlaceholder: {
    display: "grid",
    placeItems: "center",
    width: "100%",
    height: 190,
    background: "linear-gradient(135deg, #d7e6ea, #edf5f7)",
    color: "#52606d",
    fontWeight: 700
  },
  uploadBox: {
    display: "grid",
    gap: 10,
    marginTop: 16,
    padding: 12,
    border: "1px solid #d9e1e8",
    borderRadius: 8,
    background: "#f9fbfc"
  },
  imagePositionEditor: {
    display: "grid",
    gap: 10
  },
  imageEditorFrame: {
    position: "relative",
    minHeight: 240,
    overflow: "hidden",
    borderRadius: 10,
    border: "1px solid #d9e1e8",
    background: "#eef4f6",
    touchAction: "none",
    cursor: "grab"
  },
  imageEditorImg: {
    width: "100%",
    height: 240,
    display: "block",
    userSelect: "none"
  },
  positionControls: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between"
  },
  rangeInput: {
    width: "100%",
    marginTop: 8
  },
  compactTitle: {
    margin: 0,
    fontSize: 16
  },
  boardPhotoPreview: {
    width: "100%",
    maxHeight: 240,
    objectFit: "cover",
    borderRadius: 8,
    border: "1px solid #d9e1e8",
    background: "#e8eef2"
  },
  boardPhotoPlaceholder: {
    display: "grid",
    placeItems: "center",
    minHeight: 150,
    borderRadius: 8,
    border: "1px dashed #aeb8c2",
    background: "#f3f6f8",
    color: "#52606d",
    fontWeight: 700
  },
  modalDetailsStack: {
    display: "grid",
    gap: 14
  },
  modalHeroImage: {
    width: "100%",
    height: 280,
    display: "block",
    borderRadius: 10,
    border: "1px solid #d9e1e8",
    background: "#e8eef2"
  },
  profilePhotoPreview: {
    width: 120,
    height: 120,
    objectFit: "cover",
    borderRadius: "50%",
    border: "1px solid #d9e1e8",
    background: "#e8eef2"
  },
  profileHeader: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap"
  },
  profileHeaderText: {
    display: "grid",
    gap: 4,
    color: "#52606d"
  },
  profilePhotoPlaceholder: {
    display: "grid",
    placeItems: "center",
    width: 120,
    height: 120,
    borderRadius: "50%",
    border: "1px dashed #aeb8c2",
    background: "#f3f6f8",
    color: "#52606d",
    textAlign: "center",
    fontWeight: 700
  },
  adminSalonPhoto: {
    width: 72,
    height: 48,
    objectFit: "cover",
    borderRadius: 6,
    border: "1px solid #d9e1e8"
  },
  salonName: {
    fontSize: 19,
    lineHeight: 1.3
  },
  salonText: {
    color: "#52606d",
    lineHeight: 1.35
  },
  salonMeta: {
    color: "#0f3f3a",
    fontWeight: 700,
    padding: "8px 10px",
    borderRadius: 10,
    background: "#eefaf8",
    border: "1px solid #d8efea"
  },
  topSalonBadge: {
    justifySelf: "start",
    padding: "5px 8px",
    borderRadius: 999,
    background: "#fff7e8",
    color: "#8a5a00",
    fontWeight: 800,
    fontSize: 13
  },
  providerHeroBadge: {
    display: "inline-flex",
    alignItems: "center",
    marginTop: 12
  },
  ratingLine: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    color: "#8a5a00",
    fontWeight: 800,
    flexWrap: "wrap"
  },
  ratingBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 50,
    padding: "6px 10px",
    borderRadius: 999,
    background: "#0f766e",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 800,
    boxShadow: "0 8px 18px rgba(15, 118, 110, 0.18)"
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "fit-content",
    padding: "6px 10px",
    borderRadius: 999,
    background: "#eefaf8",
    color: "#0f766e",
    fontSize: 12,
    fontWeight: 800
  },
  distanceBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 2,
    background: "rgba(15, 23, 42, 0.82)",
    color: "#ffffff",
    boxShadow: "0 10px 22px rgba(15, 23, 42, 0.22)"
  },
  cardHeaderRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10
  },
  cardMetaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8
  },
  cardStatGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 8
  },
  cardContentStack: {
    display: "grid",
    gap: 8,
    padding: "0 16px 16px"
  },
  reviewBox: {
    display: "grid",
    gap: 6,
    margin: "10px 0 14px",
    padding: 12,
    border: "1px solid #f1d28a",
    borderRadius: 8,
    background: "#fffaf0",
    color: "#3b2f17"
  },
  bookNowPill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    padding: "9px 12px",
    borderRadius: 999,
    background: "#0f766e",
    color: "#ffffff",
    fontWeight: 800,
    flex: 1
  },
  sectionTitle: {
    margin: "0 0 8px",
    fontSize: 20
  },
  sectionTitleWithIcon: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    margin: "0 0 8px",
    fontSize: 20
  },
  smallTitle: {
    margin: "12px 0 0",
    fontSize: 16
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap"
  },
  list: {
    display: "grid",
    gap: 10,
    marginTop: 12
  },
  compactList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
    marginTop: 12
  },
  insightGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 10,
    marginTop: 12
  },
  summaryCard: {
    display: "grid",
    gap: 4,
    padding: 12,
    border: "1px solid #d9e1e8",
    borderRadius: 8,
    background: "#f9fbfc"
  },
  clickableSummaryCard: {
    display: "grid",
    gap: 4,
    padding: 12,
    border: "1px solid #0f766e",
    borderRadius: 8,
    background: "#eefaf8",
    color: "#0f3f3a",
    textAlign: "left",
    cursor: "pointer"
  },
  listItem: {
    display: "grid",
    gap: 4,
    padding: 12,
    border: "1px solid #d9e1e8",
    borderRadius: 8,
    background: "#f9fbfc"
  },
  productCard: {
    position: "relative",
    overflow: "hidden",
    alignContent: "start",
    minHeight: "100%",
    border: "1px solid #d9e1e8",
    borderRadius: 18,
    background: "#ffffff",
    padding: 0,
    boxShadow: "0 16px 32px rgba(15, 63, 58, 0.08)"
  },
  productCardUnavailable: {
    opacity: 0.62,
    filter: "grayscale(0.25)"
  },
  productMediaWrap: {
    position: "relative",
    minHeight: 190,
    background: "#dfe9ec"
  },
  productBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 2,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    boxShadow: "0 6px 16px rgba(23, 32, 38, 0.14)"
  },
  productBadgeHair: {
    background: "#eaf2ff",
    color: "#1d4ed8"
  },
  productBadgeBeauty: {
    background: "#ffe8f3",
    color: "#be185d"
  },
  productBadgeMakeup: {
    background: "#f1e8ff",
    color: "#7c3aed"
  },
  productOverlayLabel: {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
    borderRadius: 6,
    background: "rgba(15, 23, 42, 0.38)",
    color: "#ffffff",
    fontWeight: 800,
    letterSpacing: 0.2
  },
  cardPrice: {
    color: "#0f3f3a",
    fontWeight: 800,
    fontSize: 18
  },
  lowStockText: {
    color: "#c2410c",
    fontWeight: 700
  },
  outOfStockText: {
    color: "#b42318",
    fontWeight: 800
  },
  tabRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: 8,
    marginTop: 12
  },
  tableWrap: {
    overflowX: "auto",
    marginTop: 12,
    WebkitOverflowScrolling: "touch"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 980
  },
  th: {
    padding: 10,
    borderBottom: "1px solid #d9e1e8",
    background: "#f9fbfc",
    textAlign: "left",
    fontSize: 14,
    whiteSpace: "nowrap"
  },
  td: {
    padding: 10,
    borderBottom: "1px solid #edf1f5",
    verticalAlign: "top",
    fontSize: 14,
    whiteSpace: "nowrap"
  },
  tableCellStack: {
    display: "grid",
    gap: 3
  },
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
    alignItems: "end",
    marginTop: 12
  },
  serviceCard: {
    display: "grid",
    gap: 10,
    alignContent: "start",
    width: "100%",
    minWidth: 0,
    padding: 16,
    border: "1px solid #d9e1e8",
    borderRadius: 16,
    background: "#ffffff",
    textAlign: "left",
    boxShadow: "0 12px 26px rgba(15, 63, 58, 0.06)",
    cursor: "pointer"
  },
  emptyState: {
    display: "grid",
    justifyItems: "center",
    gap: 10,
    padding: 28,
    border: "1px dashed #cdd9de",
    borderRadius: 16,
    background: "#f8fbfc",
    color: "#52606d",
    textAlign: "center"
  },
  loadingCard: {
    pointerEvents: "none"
  },
  loadingLineWide: {
    height: 16,
    margin: "0 16px",
    borderRadius: 999,
    background: "linear-gradient(90deg, #edf2f5, #dfe8ec, #edf2f5)"
  },
  loadingLine: {
    height: 12,
    margin: "0 16px",
    borderRadius: 999,
    background: "linear-gradient(90deg, #edf2f5, #dfe8ec, #edf2f5)"
  },
  loadingLineShort: {
    width: "45%",
    height: 12,
    margin: "0 16px 16px",
    borderRadius: 999,
    background: "linear-gradient(90deg, #edf2f5, #dfe8ec, #edf2f5)"
  },
  adminBookingFilters: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 10,
    alignItems: "end",
    marginTop: 12,
    maxWidth: "100%"
  },
  chartBox: {
    width: "100%",
    height: 280,
    marginTop: 14,
    padding: 8,
    border: "1px solid #d9e1e8",
    borderRadius: 8,
    background: "#ffffff"
  },
  slotGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 10,
    marginTop: 14
  },
  slotButton: {
    padding: 12,
    border: "1px solid #0f766e",
    borderRadius: 6,
    background: "#0f766e",
    color: "#ffffff",
    fontSize: 15,
    cursor: "pointer"
  },
  disabledSlotButton: {
    border: "1px solid #c7d0d9",
    background: "#eef2f5",
    color: "#6b7280",
    cursor: "not-allowed"
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "fit-content",
    padding: "4px 9px",
    borderRadius: 999,
    background: "#eef2f5",
    color: "#52606d",
    fontSize: 13,
    fontWeight: 800,
    textTransform: "capitalize"
  },
  badgeConfirmed: {
    background: "#e8f7f3",
    color: "#0f766e"
  },
  badgeCancelled: {
    background: "#fff4f2",
    color: "#b42318"
  },
  badgeCompleted: {
    background: "#eef4ff",
    color: "#1d4ed8"
  },
  badgePaid: {
    background: "#effaf5",
    color: "#0f5132"
  },
  smallButton: {
    minHeight: 44,
    padding: "10px 12px",
    border: "1px solid #0f766e",
    borderRadius: 6,
    background: "#ffffff",
    color: "#0f766e",
    cursor: "pointer"
  },
  linkButton: {
    padding: 0,
    border: 0,
    background: "transparent",
    color: "#0f766e",
    fontWeight: 800,
    cursor: "pointer",
    textAlign: "left"
  },
  dangerButton: {
    minHeight: 44,
    padding: "10px 12px",
    border: "1px solid #b42318",
    borderRadius: 6,
    background: "#ffffff",
    color: "#b42318",
    cursor: "pointer"
  },
  dangerFullButton: {
    width: "100%",
    marginTop: 12,
    padding: 12,
    border: "1px solid #b42318",
    borderRadius: 6,
    background: "#ffffff",
    color: "#b42318",
    fontSize: 16,
    cursor: "pointer"
  },
  buttonRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 8
  },
  dayGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
    gap: 8
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 12
  },
  message: {
    margin: "12px 0",
    color: "#5c6670"
  },
  errorMessage: {
    margin: "12px 0",
    padding: 10,
    border: "1px solid #f2b8b5",
    borderRadius: 6,
    background: "#fff4f2",
    color: "#b42318"
  },
  successNotice: {
    margin: "12px 0",
    padding: 10,
    border: "1px solid #9ed8c7",
    borderRadius: 6,
    background: "#effaf5",
    color: "#0f5132"
  },
  successCard: {
    display: "grid",
    gap: 6,
    marginTop: 14,
    padding: 14,
    border: "1px solid #9ed8c7",
    borderRadius: 8,
    background: "#effaf5",
    color: "#173b32"
  },
  successTitle: {
    fontSize: 18,
    color: "#0f766e"
  },
  confirmCard: {
    display: "grid",
    gap: 8,
    margin: "12px 0",
    padding: 14,
    border: "1px solid #f2b8b5",
    borderRadius: 8,
    background: "#fff8f6",
    color: "#172026"
  },
  dangerZone: {
    display: "grid",
    gap: 8,
    margin: "12px 0",
    padding: 12,
    border: "1px solid #f2b8b5",
    borderRadius: 8,
    background: "#fff8f6",
    color: "#7a271a"
  },
  starRow: {
    display: "flex",
    gap: 6,
    marginTop: 8
  },
  starButton: {
    width: 44,
    height: 44,
    border: "1px solid #c7d0d9",
    borderRadius: 8,
    background: "#ffffff",
    color: "#8a94a3",
    fontSize: 24,
    cursor: "pointer"
  },
  starButtonActive: {
    width: 44,
    height: 44,
    border: "1px solid #f4b860",
    borderRadius: 8,
    background: "#fff7e8",
    color: "#b7791f",
    fontSize: 24,
    cursor: "pointer"
  }
};

export default App;
