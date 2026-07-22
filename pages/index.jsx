import { useEffect, useState } from "react";

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [envelopes, setEnvelopes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [shipping, setShipping] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [tab, setTab] = useState("envelopes");

  async function fetchData() {
    setLoading(true);
    try {
      const [statsRes, envRes, custRes, shipRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/envelopes"),
        fetch("/api/customers"),
        fetch("/api/shipping"),
      ]);
      setStats(await statsRes.json());
      const envData = (await envRes.json()).envelopes || [];
      setEnvelopes(envData);
      setCustomers((await custRes.json()).customers || []);
      setShipping((await shipRes.json()).shipping || []);

      // ── Pre-populate rewards from existing sheet data ──────
      const productMap = {};
      const discountMap = {};

      envData.forEach((env) => {
        if (env.type === "product" && env.product_url) {
          const key = env.product_url;
          if (!productMap[key]) {
            productMap[key] = {
              url: env.product_url,
              image: env.product_image || "",
              title: env.product_url,
              msg: env.reward_message || "",
              selectedEnvelopes: new Set(),
            };
          }
          productMap[key].selectedEnvelopes.add(env.envelope_number);
        }

        if (env.type === "discount" && env.discount_code) {
          const key = env.discount_code;
          if (!discountMap[key]) {
            discountMap[key] = {
              code: env.discount_code,
              msg: env.reward_message || "",
              selectedEnvelopes: new Set(),
            };
          }
          discountMap[key].selectedEnvelopes.add(env.envelope_number);
        }

        if (env.type === "empty" && env.reward_message) {
          setLoseMsg(env.reward_message);
        }
      });

      const productList = Object.values(productMap);
      const discountList = Object.values(discountMap);

      if (productList.length > 0) setProducts(productList);
      if (discountList.length > 0) setDiscounts(discountList);
    } catch (err) {
      showMsg("Failed to load data", "error");
    }
    setLoading(false);
  }
  async function handleReset() {
    if (!confirm("Reset ALL envelopes? This cannot be undone.")) return;
    setResetting(true);
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      const data = await res.json();
      setMessage(data.message || "Reset done");
      fetchData();
    } catch (err) {
      setMessage("Reset failed");
    }
    setResetting(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  const filteredEnvelopes = envelopes.filter((env) => {
    const matchFilter = filter === "all" || env.status === filter;
    const matchSearch =
      !search ||
      (env.customer_email || "").toLowerCase().includes(search.toLowerCase()) ||
      String(env.envelope_number).includes(search) ||
      (env.order_id || "").toString().includes(search);
    return matchFilter && matchSearch;
  });

  const filteredCustomers = customers.filter(
    (c) =>
      !search ||
      (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.order_id || "").toString().includes(search),
  );

  const notClaimedYet = customers.filter((c) => {
    const claimed = c.has_claimed === true || c.has_claimed === "TRUE";
    const matchSearch =
      !search ||
      (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.order_id || "").toString().includes(search);
    return !claimed && matchSearch;
  });

  const filteredShipping = shipping.filter(
    (s) =>
      !search ||
      (s.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.order_id || "").toString().includes(search),
  );

  const Th = ({ children }) => (
    <th
      style={{
        textAlign: "left",
        padding: "12px 20px",
        fontSize: "12px",
        fontWeight: 700,
        color: "#64748b",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        borderBottom: "1px solid #f1f5f9",
        background: "#f8fafc",
      }}
    >
      {children}
    </th>
  );

  const Td = ({ children }) => (
    <td style={{ padding: "14px 20px", fontSize: "14px", color: "#475569" }}>
      {children}
    </td>
  );

  const tabBtn = (t, label) => (
    <button
      onClick={() => {
        setTab(t);
        setSearch("");
        setFilter("all");
      }}
      style={{
        padding: "10px 16px",
        borderRadius: "8px 8px 0 0",
        border: "1px solid #e2e8f0",
        borderBottom: tab === t ? "1px solid #fff" : "1px solid #e2e8f0",
        fontSize: "13px",
        fontWeight: 700,
        cursor: "pointer",
        background: tab === t ? "#fff" : "#f8fafc",
        color: tab === t ? "#1e293b" : "#64748b",
        marginBottom: "-1px",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: "#1e293b",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #e2e8f0",
          padding: "0 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "64px",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "22px" }}>🎁</span>
          <span style={{ fontWeight: 700, fontSize: "18px" }}>
            Mystery Vault
          </span>
          <span
            style={{
              background: "#f1f5f9",
              color: "#64748b",
              fontSize: "12px",
              fontWeight: 600,
              padding: "2px 10px",
              borderRadius: "20px",
            }}
          >
            Admin
          </span>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={fetchData}
            style={{
              padding: "8px 16px",
              background: "#f1f5f9",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              color: "#475569",
            }}
          >
            ↻ Refresh
          </button>
          <button
            onClick={handleReset}
            disabled={resetting}
            style={{
              padding: "8px 16px",
              background: resetting ? "#fca5a5" : "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: resetting ? "not-allowed" : "pointer",
            }}
          >
            {resetting ? "Resetting..." : "⚠ Reset All"}
          </button>
        </div>
      </div>

      <div
        style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}
      >
        {message && (
          <div
            style={{
              background: "#dcfce7",
              border: "1px solid #86efac",
              color: "#166534",
              padding: "12px 20px",
              borderRadius: "10px",
              marginBottom: "24px",
              fontWeight: 600,
              fontSize: "14px",
            }}
          >
            {message}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: "16px",
              marginBottom: "32px",
            }}
          >
            {[
              {
                label: "Total Envelopes",
                value: stats.total,
                icon: "📦",
                bg: "#f8fafc",
                border: "#e2e8f0",
                val: "#1e293b",
              },
              {
                label: "Claimed",
                value: stats.claimed,
                icon: "✅",
                bg: "#f0fdf4",
                border: "#86efac",
                val: "#16a34a",
              },
              {
                label: "Unclaimed",
                value: stats.unclaimed,
                icon: "🔓",
                bg: "#eff6ff",
                border: "#93c5fd",
                val: "#2563eb",
              },
              {
                label: "Eligible Customers",
                value: stats.total_eligible,
                icon: "👥",
                bg: "#fdf4ff",
                border: "#d8b4fe",
                val: "#9333ea",
              },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: s.bg,
                  border: `1px solid ${s.border}`,
                  borderRadius: "14px",
                  padding: "24px",
                }}
              >
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>
                  {s.icon}
                </div>
                <div
                  style={{ fontSize: "32px", fontWeight: 800, color: s.val }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#64748b",
                    fontWeight: 500,
                    marginTop: "4px",
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <input
          type="text"
          placeholder="Search email, name, order ID, envelope #..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 16px",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "14px",
            outline: "none",
            background: "#fff",
            color: "#1e293b",
            marginBottom: "20px",
            boxSizing: "border-box",
          }}
        />

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {tabBtn("envelopes", "📦 Envelopes")}
          {tabBtn(
            "customers",
            `👥 Eligible Customers (${filteredCustomers.length})`,
          )}
          {tabBtn("notclaimed", `⏳ Not Claimed (${notClaimedYet.length})`)}
          {tabBtn("shipping", `🚚 Shipping (${filteredShipping.length})`)}
        </div>

        {/* Table */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "0 14px 14px 14px",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          {tab === "envelopes" && (
            <div
              style={{
                padding: "12px 20px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              {["all", "claimed", "unclaimed"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "20px",
                    border: "1px solid",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    background: filter === f ? "#1e293b" : "#f8fafc",
                    color: filter === f ? "#fff" : "#64748b",
                    borderColor: filter === f ? "#1e293b" : "#e2e8f0",
                  }}
                >
                  {f === "all"
                    ? "All"
                    : f === "claimed"
                      ? "✅ Claimed"
                      : "🔓 Unclaimed"}
                </button>
              ))}
              <span
                style={{
                  color: "#94a3b8",
                  fontSize: "13px",
                  marginLeft: "auto",
                  alignSelf: "center",
                }}
              >
                {filteredEnvelopes.length} results
              </span>
            </div>
          )}

          {loading ? (
            <div
              style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}
            >
              Loading...
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "600px",
                }}
              >
                {/* ENVELOPES TAB */}
                {tab === "envelopes" && (
                  <>
                    <thead>
                      <tr>
                        <Th>Envelope</Th>
                        <Th>Status</Th>
                        <Th>Customer Email</Th>
                        <Th>Order ID</Th>
                        <Th>Claimed At</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEnvelopes.map((env, i) => (
                        <tr
                          key={env.envelope_number}
                          style={{
                            borderBottom: "1px solid #f8fafc",
                            background: i % 2 === 0 ? "#fff" : "#fafafa",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "#f0f9ff")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background =
                              i % 2 === 0 ? "#fff" : "#fafafa")
                          }
                        >
                          <td
                            style={{
                              padding: "14px 20px",
                              fontWeight: 700,
                              color: "#3b82f6",
                            }}
                          >
                            #{env.envelope_number}
                          </td>
                          <Td>
                            <span
                              style={{
                                padding: "4px 10px",
                                borderRadius: "20px",
                                fontSize: "12px",
                                fontWeight: 700,
                                background:
                                  env.status === "claimed"
                                    ? "#dcfce7"
                                    : "#f1f5f9",
                                color:
                                  env.status === "claimed"
                                    ? "#16a34a"
                                    : "#94a3b8",
                              }}
                            >
                              {env.status === "claimed"
                                ? "✅ Claimed"
                                : "Unclaimed"}
                            </span>
                          </Td>
                          <Td>{env.customer_email || "—"}</Td>
                          <Td>{env.order_id || "—"}</Td>
                          <Td>
                            {env.claimed_at
                              ? new Date(env.claimed_at).toLocaleString()
                              : "—"}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* ELIGIBLE CUSTOMERS TAB */}
                {tab === "customers" && (
                  <>
                    <thead>
                      <tr>
                        <Th>Email</Th>
                        <Th>Order ID</Th>
                        <Th>Order Amount</Th>
                        <Th>Registered At</Th>
                        <Th>Status</Th>
                        <Th>Claimed Envelope</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            style={{
                              padding: "40px",
                              textAlign: "center",
                              color: "#94a3b8",
                            }}
                          >
                            No customers yet
                          </td>
                        </tr>
                      ) : (
                        filteredCustomers.map((c, i) => {
                          const claimed =
                            c.has_claimed === true || c.has_claimed === "TRUE";
                          return (
                            <tr
                              key={i}
                              style={{
                                borderBottom: "1px solid #f8fafc",
                                background: i % 2 === 0 ? "#fff" : "#fafafa",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background = "#f0f9ff")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background =
                                  i % 2 === 0 ? "#fff" : "#fafafa")
                              }
                            >
                              <td
                                style={{
                                  padding: "14px 20px",
                                  fontWeight: 600,
                                  color: "#1e293b",
                                }}
                              >
                                {c.email}
                              </td>
                              <Td>{c.order_id || "—"}</Td>
                              <Td>
                                {c.order_amount ? `$${c.order_amount}` : "—"}
                              </Td>
                              <Td>
                                {c.created_at
                                  ? new Date(c.created_at).toLocaleString()
                                  : "—"}
                              </Td>
                              <Td>
                                <span
                                  style={{
                                    padding: "4px 10px",
                                    borderRadius: "20px",
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    background: claimed ? "#dcfce7" : "#fef9c3",
                                    color: claimed ? "#16a34a" : "#854d0e",
                                  }}
                                >
                                  {claimed ? "✅ Claimed" : "⏳ Pending"}
                                </span>
                              </Td>
                              <Td>
                                {c.claimed_envelope
                                  ? `#${c.claimed_envelope}`
                                  : "—"}
                              </Td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </>
                )}

                {/* NOT CLAIMED YET TAB */}
                {tab === "notclaimed" && (
                  <>
                    <thead>
                      <tr>
                        <Th>Email</Th>
                        <Th>Order ID</Th>
                        <Th>Order Amount</Th>
                        <Th>Registered At</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {notClaimedYet.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            style={{
                              padding: "40px",
                              textAlign: "center",
                              color: "#94a3b8",
                            }}
                          >
                            🎉 Everyone has claimed!
                          </td>
                        </tr>
                      ) : (
                        notClaimedYet.map((c, i) => (
                          <tr
                            key={i}
                            style={{
                              borderBottom: "1px solid #f8fafc",
                              background: i % 2 === 0 ? "#fff" : "#fafafa",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = "#fffbeb")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background =
                                i % 2 === 0 ? "#fff" : "#fafafa")
                            }
                          >
                            <td
                              style={{
                                padding: "14px 20px",
                                fontWeight: 600,
                                color: "#1e293b",
                              }}
                            >
                              {c.email}
                            </td>
                            <Td>{c.order_id || "—"}</Td>
                            <Td>
                              {c.order_amount ? `$${c.order_amount}` : "—"}
                            </Td>
                            <Td>
                              {c.created_at
                                ? new Date(c.created_at).toLocaleString()
                                : "—"}
                            </Td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </>
                )}

                {/* SHIPPING TAB */}
                {tab === "shipping" && (
                  <>
                    <thead>
                      <tr>
                        <Th>Email</Th>
                        <Th>Full Name</Th>
                        <Th>Address</Th>
                        <Th>City</Th>
                        <Th>State</Th>
                        <Th>ZIP</Th>
                        <Th>Country</Th>
                        <Th>Saved At</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredShipping.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            style={{
                              padding: "40px",
                              textAlign: "center",
                              color: "#94a3b8",
                            }}
                          >
                            No shipping addresses yet
                          </td>
                        </tr>
                      ) : (
                        filteredShipping.map((s, i) => (
                          <tr
                            key={i}
                            style={{
                              borderBottom: "1px solid #f8fafc",
                              background: i % 2 === 0 ? "#fff" : "#fafafa",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = "#f0f9ff")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background =
                                i % 2 === 0 ? "#fff" : "#fafafa")
                            }
                          >
                            <td
                              style={{
                                padding: "14px 20px",
                                fontWeight: 600,
                                color: "#1e293b",
                              }}
                            >
                              {s.email}
                            </td>
                            <Td>{s.full_name || "—"}</Td>
                            <Td>
                              {s.address1}
                              {s.address2 ? `, ${s.address2}` : ""}
                            </Td>
                            <Td>{s.city || "—"}</Td>
                            <Td>{s.state || "—"}</Td>
                            <Td>{s.zip || "—"}</Td>
                            <Td>{s.country || "—"}</Td>
                            <Td>
                              {s.saved_at
                                ? new Date(s.saved_at).toLocaleString()
                                : "—"}
                            </Td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </>
                )}
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
