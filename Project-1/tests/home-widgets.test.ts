import { describe, it, expect, vi, beforeEach } from "vitest";
import * as HomeWidgetsRoute from "../app/api/home-widgets/route";
import { DEFAULT_VIZ_CONFIG, MAX_CUSTOM_WIDGETS } from "../lib/viz";

// Mock Supabase Server client and user session
let mockSessionUser: { id: string; email?: string } | null = null;
let mockDatabaseRows: Array<{
  id: string;
  user_id: string;
  config: any;
  position: number;
}> = [];

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => {
        if (!mockSessionUser) {
          return { data: { user: null }, error: new Error("No session") };
        }
        return { data: { user: mockSessionUser }, error: null };
      }),
    },
    from: vi.fn((tableName: string) => {
      let currentFilterUserId: string | null = null;
      let currentFilterConfigId: string | null = null;

      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn((col: string, val: any) => {
          if (col === "user_id") currentFilterUserId = val;
          return queryBuilder;
        }),
        filter: vi.fn((col: string, op: string, val: any) => {
          if (col === "config->>id" && op === "eq") currentFilterConfigId = val;
          return queryBuilder;
        }),
        order: vi.fn(async () => {
          const filtered = mockDatabaseRows.filter(
            (r) => !currentFilterUserId || r.user_id === currentFilterUserId
          );
          return { data: filtered, error: null };
        }),
        delete: vi.fn(() => ({
          eq: vi.fn((col: string, val: any) => {
            if (col === "user_id") currentFilterUserId = val;
            return {
              filter: vi.fn((fCol: string, fOp: string, fVal: any) => {
                mockDatabaseRows = mockDatabaseRows.filter((r) => {
                  if (r.user_id !== currentFilterUserId) return true;
                  return r.config?.id !== fVal;
                });
                return Promise.resolve({ error: null });
              }),
              then: (resolve: any) => {
                mockDatabaseRows = mockDatabaseRows.filter(
                  (r) => r.user_id !== currentFilterUserId
                );
                return resolve({ error: null });
              },
            };
          }),
        })),
        insert: vi.fn(async (rows: any[]) => {
          for (const row of rows) {
            mockDatabaseRows.push({
              id: `row_${Date.now()}_${Math.random()}`,
              user_id: row.user_id,
              config: row.config,
              position: row.position,
            });
          }
          return { error: null };
        }),
      };

      return queryBuilder;
    }),
  })),
}));

describe("STAGE 5: /api/home-widgets Persistence & Security Rules", () => {
  beforeEach(() => {
    mockSessionUser = null;
    mockDatabaseRows = [];
  });

  describe("401 Unauthorized Checks", () => {
    it("returns 401 for GET without session", async () => {
      mockSessionUser = null;
      const res = await HomeWidgetsRoute.GET(
        new Request("http://localhost/api/home-widgets")
      );
      expect(res.status).toBe(401);
    });

    it("returns 401 for PUT without session", async () => {
      mockSessionUser = null;
      const res = await HomeWidgetsRoute.PUT(
        new Request("http://localhost/api/home-widgets", {
          method: "PUT",
          body: JSON.stringify({ widgets: [] }),
        })
      );
      expect(res.status).toBe(401);
    });

    it("returns 401 for DELETE without session", async () => {
      mockSessionUser = null;
      const res = await HomeWidgetsRoute.DELETE(
        new Request("http://localhost/api/home-widgets?id=custom:viz_1", {
          method: "DELETE",
        })
      );
      expect(res.status).toBe(401);
    });
  });

  describe("Cross-User Isolation", () => {
    it("never returns widgets belonging to another user", async () => {
      // Seed User B's widgets
      mockDatabaseRows = [
        {
          id: "w_1",
          user_id: "usr_attacker",
          config: { id: "heatmap", label: "Attacker Heatmap", visible: true },
          position: 0,
        },
      ];

      // Sign in as User A
      mockSessionUser = { id: "usr_victim", email: "victim@example.com" };

      const res = await HomeWidgetsRoute.GET(
        new Request("http://localhost/api/home-widgets")
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.widgets).toEqual([]); // User A sees 0 widgets
    });

    it("blocks cross-user deletion", async () => {
      // User B owns a widget
      mockDatabaseRows = [
        {
          id: "w_b",
          user_id: "usr_user_b",
          config: { id: "custom:viz_b", label: "User B Viz", visible: true },
          position: 0,
        },
      ];

      // User A tries to delete User B's widget
      mockSessionUser = { id: "usr_user_a", email: "user_a@example.com" };
      const res = await HomeWidgetsRoute.DELETE(
        new Request("http://localhost/api/home-widgets?id=custom:viz_b", {
          method: "DELETE",
        })
      );

      expect(res.status).toBe(200);
      // User B's widget is NOT deleted because user_id filter did not match
      expect(mockDatabaseRows.length).toBe(1);
      expect(mockDatabaseRows[0].user_id).toBe("usr_user_b");
    });
  });

  describe("Size and Count Caps", () => {
    beforeEach(() => {
      mockSessionUser = { id: "usr_valid", email: "valid@example.com" };
    });

    it("rejects total request body larger than 64KB with 413", async () => {
      // 70 KB payload
      const hugePadding = "x".repeat(70000);
      const res = await HomeWidgetsRoute.PUT(
        new Request("http://localhost/api/home-widgets", {
          method: "PUT",
          body: JSON.stringify({ widgets: [], padding: hugePadding }),
        })
      );

      expect(res.status).toBe(413);
      const json = await res.json();
      expect(json.error).toMatch(/exceeds maximum allowed size/i);
    });

    it("rejects individual widget configuration larger than 16KB with 413", async () => {
      const largeTitle = "A".repeat(17000);
      const widgets = [
        {
          id: "custom:large",
          label: "Too large",
          visible: true,
          kind: "custom",
          vizConfig: { ...DEFAULT_VIZ_CONFIG, title: largeTitle },
        },
      ];

      const res = await HomeWidgetsRoute.PUT(
        new Request("http://localhost/api/home-widgets", {
          method: "PUT",
          body: JSON.stringify({ widgets }),
        })
      );

      // Should be rejected by zod or size cap
      expect([400, 413]).toContain(res.status);
    });

    it("caps or rejects more than 30 custom widgets", async () => {
      const widgets = [];
      for (let i = 0; i < 35; i++) {
        widgets.push({
          id: `custom:viz_${i}`,
          label: `Visual ${i}`,
          visible: true,
          kind: "custom" as const,
          vizConfig: { ...DEFAULT_VIZ_CONFIG, id: `viz_${i}`, title: `Visual ${i}` },
        });
      }

      const res = await HomeWidgetsRoute.PUT(
        new Request("http://localhost/api/home-widgets", {
          method: "PUT",
          body: JSON.stringify({ widgets }),
        })
      );

      // Either safeParseStoredWidgets caps it at 30 or route returns 200 with 30 stored
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.widgets.length).toBeLessThanOrEqual(MAX_CUSTOM_WIDGETS);
    });

    it("rejects total widgets count exceeding 50 with 400", async () => {
      const widgets = [];
      for (let i = 0; i < 55; i++) {
        widgets.push({
          id: `widget_${i}`,
          label: `Widget ${i}`,
          visible: true,
        });
      }

      const res = await HomeWidgetsRoute.PUT(
        new Request("http://localhost/api/home-widgets", {
          method: "PUT",
          body: JSON.stringify({ widgets }),
        })
      );

      expect(res.status).toBe(400);
    });
  });

  describe("Successful CRUD Lifecycle", () => {
    it("saves and retrieves widgets for an authenticated user", async () => {
      mockSessionUser = { id: "usr_alice", email: "alice@example.com" };

      const widgetsToSave = [
        { id: "heatmap", label: "Heatmap", visible: true, span: "2", colSpan: 12 },
        {
          id: "custom:viz_growth",
          label: "Monthly Growth",
          visible: true,
          kind: "custom",
          colSpan: 6,
          vizConfig: {
            ...DEFAULT_VIZ_CONFIG,
            id: "viz_growth",
            title: "Monthly Growth",
            chartType: "area",
            dimension: "created_month",
          },
        },
      ];

      const saveRes = await HomeWidgetsRoute.PUT(
        new Request("http://localhost/api/home-widgets", {
          method: "PUT",
          body: JSON.stringify({ widgets: widgetsToSave }),
        })
      );

      expect(saveRes.status).toBe(200);
      const saveJson = await saveRes.json();
      expect(saveJson.success).toBe(true);
      expect(saveJson.widgets.length).toBe(2);

      // GET should return the saved widgets
      const getRes = await HomeWidgetsRoute.GET(
        new Request("http://localhost/api/home-widgets")
      );
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.success).toBe(true);
      expect(getJson.widgets.length).toBe(2);
      expect(getJson.widgets[1].id).toBe("custom:viz_growth");
    });
  });
});

