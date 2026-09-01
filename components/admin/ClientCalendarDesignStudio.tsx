"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TemplatePreviewModal,
  TemplateVisual,
  type DriveTemplate,
} from "./ClientTemplateManager";
import {
  CAROUSEL_FAMILY_OPTIONS,
  STATIC_FAMILY_LABELS,
  VIDEO_FAMILY_OPTIONS,
  VIDEO_TYPOGRAPHY_OPTIONS,
} from "@/lib/client-design-studio";

type StudioTab = "resumen" | "carruseles" | "videos" | "estaticas";
export interface TemplateBankResponse {
  client: { logoUrl: string | null };
  selected: string[];
  library: DriveTemplate[];
  error?: string;
}
export interface StaticDesign {
  id: string;
  template_id: string;
  piece_type: "banner" | "flyer";
  mold_type: number;
  width: number;
  height: number;
  variant: string;
  previewUrl: string | null;
}
export interface StudioResponse {
  installedCarouselNames?: string[];
  carouselAssignments: Array<{ designName: string; families: string[] }>;
  videoAssignments: Array<{ family: string; typographyIds: string[] }>;
  staticAssignments: Array<{ templateLibraryId: string }>;
  staticLibrary: StaticDesign[];
  error?: string;
}
interface Props {
  clientId: string;
  clientName: string;
  calendarCode: string;
  calendarName: string;
  previewData?: { bank: TemplateBankResponse; studio: StudioResponse };
}

const TABS: Array<{ key: StudioTab; label: string; step: string }> = [
  { key: "resumen", label: "Vista general", step: "Tu semana" },
  { key: "carruseles", label: "Carruseles", step: "Paso 1" },
  { key: "videos", label: "Videos", step: "Paso 2" },
  { key: "estaticas", label: "Banners y flyers", step: "Paso 3" },
];

function prettyDesignName(value: string) {
  const cleaned = value.replace(/[bank?.library, searchQuery](hbs|html)$/iu, "").trim();
  if (/^main$/iu.test(cleaned)) return "Diseño principal";
  return (
    cleaned
      .replace(/^brand_guidelines_?/iu, "Diseño ")
      .replaceAll("_", " ")
      .trim() || "Diseño principal"
  );
}
function prettyStaticName(value: string) {
  return value
    .replace(/^banner_molde_\d+_/u, "")
    .replace(/^creative-/u, "")
    .replace(/-closeout-.+$/u, "")
    .replace(/-2026.+$/u, "")
    .replaceAll("-", " ")
    .replace(/\b\w/gu, (letter) => letter.toUpperCase());
}
function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px dashed var(--piedra-clara)",
        borderRadius: 16,
        padding: 24,
        color: "var(--piedra)",
        fontSize: 15,
      }}
    >
      {children}
    </div>
  );
}
function StatusBadge({ ready }: { ready: boolean }) {
  return (
    <span
      style={{
        borderRadius: 999,
        padding: "5px 8px",
        background: ready ? "var(--cardon-tenue)" : "var(--linea)",
        color: ready ? "var(--cardon)" : "var(--piedra)",
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      {ready ? "✓ Listo" : "Pendiente"}
    </span>
  );
}
function FamilySymbol({ kind }: { kind: string }) {
  const symbol =
    kind === "lugar"
      ? "⌖"
      : kind === "itinerario"
        ? "↗"
        : kind === "calendario"
          ? "17"
          : kind === "editorial"
            ? "Aa"
            : kind === "ascenso"
              ? "△"
              : kind === "conversacion"
                ? "“”"
                : "✦";
  return (
    <span
      aria-hidden
      style={{
        width: 30,
        height: 30,
        borderRadius: 9,
        display: "grid",
        placeItems: "center",
        background: "var(--cardon-tenue)",
        color: "var(--piedra)",
        fontSize: 14,
        fontWeight: 850,
      }}
    >
      {symbol}
    </span>
  );
}
function DesignMiniature({
  template,
  logoUrl,
  onPreview,
}: {
  template: DriveTemplate;
  logoUrl: string | null;
  onPreview?: () => void;
}) {
  return (
    <div
      style={{
        width: onPreview ? 86 : 64,
        flex: `0 0 ${onPreview ? 86 : 64}px`,
      }}
    >
      <TemplateVisual
        template={template}
        logoUrl={logoUrl}
        onPreview={onPreview ?? (() => {})}
        interactive={Boolean(onPreview)}
      />
    </div>
  );
}
function StaticPreview({ design }: { design: StaticDesign }) {
  const [failed, setFailed] = useState(false);
  if (!design.previewUrl || failed)
    return (
      <div
        role="img"
        aria-label={`Preview no disponible de ${prettyStaticName(design.template_id)}`}
        style={{
          width: "100%",
          height: "100%",
          display: "grid",
          alignContent: "center",
          justifyItems: "center",
          gap: 5,
          padding: 12,
          background: "var(--blanco-piedra)",
          textAlign: "center",
        }}
      >
        <strong style={{ color: "var(--tinta)", fontSize: 15 }}>
          {prettyStaticName(design.template_id)}
        </strong>
        <span style={{ color: "var(--piedra)", fontSize: 12 }}>
          {design.piece_type === "flyer" ? "Flyer" : "Banner"} · preview
          pendiente
        </span>
      </div>
    );
  return (
    <img
      src={design.previewUrl}
      alt={prettyStaticName(design.template_id)}
      onError={() => setFailed(true)}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
}

function assignedCarouselNames(studio: StudioResponse | undefined) {
  return (
    studio?.carouselAssignments
      .filter((item) => item.families.length > 0)
      .map((item) => item.designName) ?? []
  );
}

function selectedCarouselNames(
  bank: TemplateBankResponse | undefined,
  studio: StudioResponse | undefined,
) {
  const available = new Set(
    bank?.library.map((template) => template.name) ?? [],
  );
  return [
    ...new Set([
      ...(bank?.selected ?? []),
      ...(studio?.installedCarouselNames ?? []),
      ...assignedCarouselNames(studio),
    ]),
  ].filter((name) => available.size === 0 || available.has(name));
}

function snapshot(
  selectedCarousels: string[],
  carouselFamilies: Record<string, string[]>,
  videoFonts: Record<string, string[]>,
  selectedStatics: string[],
) {
  return JSON.stringify({
    selectedCarousels: [...selectedCarousels].sort(),
    carouselFamilies: Object.fromEntries(
      Object.entries(carouselFamilies)
        .map(([key, values]) => [key, [...values].sort()])
        .sort(),
    ),
    videoFonts: Object.fromEntries(
      Object.entries(videoFonts)
        .map(([key, values]) => [key, [...values].sort()])
        .sort(),
    ),
    selectedStatics: [...selectedStatics].sort(),
  });
}

export default function ClientCalendarDesignStudio({
  clientId,
  clientName,
  calendarCode,
  calendarName,
  previewData,
}: Props) {
  const [tab, setTab] = useState<StudioTab>("resumen");
  const [bank, setBank] = useState<TemplateBankResponse | null>(
    previewData?.bank ?? null,
  );
  const [studio, setStudio] = useState<StudioResponse | null>(
    previewData?.studio ?? null,
  );
  const [selectedCarousels, setSelectedCarousels] = useState<string[]>(() =>
    selectedCarouselNames(previewData?.bank, previewData?.studio),
  );
  const [carouselFamilies, setCarouselFamilies] = useState<
    Record<string, string[]>
  >(() =>
    Object.fromEntries(
      previewData?.studio.carouselAssignments.map((item) => [
        item.designName,
        item.families,
      ]) ?? [],
    ),
  );
  const [videoFonts, setVideoFonts] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      previewData?.studio.videoAssignments.map((item) => [
        item.family,
        item.typographyIds,
      ]) ?? [],
    ),
  );
  const [selectedStatics, setSelectedStatics] = useState<string[]>(
    previewData?.studio.staticAssignments.map(
      (item) => item.templateLibraryId,
    ) ?? [],
  );
  const [activeDrag, setActiveDrag] = useState<string | null>(null);
  const [focusedDesign, setFocusedDesign] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(!previewData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<DriveTemplate | null>(
    null,
  );
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    previewData
      ? snapshot(
          selectedCarouselNames(previewData.bank, previewData.studio),
          Object.fromEntries(
            previewData.studio.carouselAssignments.map((item) => [
              item.designName,
              item.families,
            ]),
          ),
          Object.fromEntries(
            previewData.studio.videoAssignments.map((item) => [
              item.family,
              item.typographyIds,
            ]),
          ),
          previewData.studio.staticAssignments.map(
            (item) => item.templateLibraryId,
          ),
        )
      : "",
  );
  const currentSnapshot = useMemo(
    () =>
      snapshot(
        selectedCarousels,
        carouselFamilies,
        videoFonts,
        selectedStatics,
      ),
    [carouselFamilies, selectedCarousels, selectedStatics, videoFonts],
  );

  const load = useCallback(async (silent = false) => {
    if (previewData) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [bankResponse, studioResponse] = await Promise.all([
        fetch(`/api/admin/clientes/${clientId}/templates`, {
          cache: "no-store",
        }),
        fetch(`/api/admin/clientes/${clientId}/content-designs`, {
          cache: "no-store",
        }),
      ]);
      const bankData = (await bankResponse.json()) as TemplateBankResponse;
      const studioData = (await studioResponse.json()) as StudioResponse;
      if (!bankResponse.ok)
        throw new Error(
          bankData.error ?? "No se pudo cargar la biblioteca de carruseles",
        );
      if (!studioResponse.ok)
        throw new Error(
          studioData.error ?? "No se pudo cargar la configuración visual",
        );
      const families = Object.fromEntries(
        studioData.carouselAssignments.map((item) => [
          item.designName,
          item.families,
        ]),
      );
      const fonts = Object.fromEntries(
        studioData.videoAssignments.map((item) => [
          item.family,
          item.typographyIds,
        ]),
      );
      const statics = studioData.staticAssignments.map(
        (item) => item.templateLibraryId,
      );
      const selected = selectedCarouselNames(bankData, studioData);
      setBank(bankData);
      setStudio(studioData);
      setSelectedCarousels(selected);
      setCarouselFamilies(families);
      setVideoFonts(fonts);
      setSelectedStatics(statics);
      setSavedSnapshot(snapshot(selected, families, fonts, statics));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo cargar el armador visual",
      );
    } finally {
      if (!silent) setLoading(false);
    }
  }, [clientId, previewData]);
  useEffect(() => {
    void load();
  }, [load]);

  const templateByName = useMemo(
    () =>
      new Map(bank?.library.map((template) => [template.name, template]) ?? []),
    [bank],
  );
  const familyAssignments = useMemo(
    () =>
      Object.fromEntries(
        CAROUSEL_FAMILY_OPTIONS.map((family) => [
          family.key,
          selectedCarousels.filter((name) =>
            (carouselFamilies[name] ?? []).includes(family.key),
          ),
        ]),
      ),
    [carouselFamilies, selectedCarousels],
  );
  const configuredCarouselFamilies = CAROUSEL_FAMILY_OPTIONS.filter(
    (family) => familyAssignments[family.key].length > 0,
  ).length;
  const filteredLibrary = useMemo(() => {
    if (!bank) return [];
    if (!searchQuery) return bank.library;
    const q = searchQuery.toLowerCase();
    return bank.library.filter((t) =>
      prettyDesignName(t.name).toLowerCase().includes(q)
    );
  }, [bank?.library, searchQuery]);

  const pendingCarouselNames = selectedCarousels.filter(
    (name) => (carouselFamilies[name]?.length ?? 0) === 0,
  );
  const configuredVideoCount = Object.values(videoFonts).filter(
    (fonts) => fonts.length > 0,
  ).length;
  const staticGroups = useMemo(
    () =>
      Object.entries(STATIC_FAMILY_LABELS)
        .map(([mold, info]) => ({
          mold: Number(mold),
          info,
          designs:
            studio?.staticLibrary.filter(
              (design) => design.mold_type === Number(mold),
            ) ?? [],
        }))
        .filter((group) => group.designs.length > 0),
    [studio],
  );
  const ready =
    configuredCarouselFamilies > 0 &&
    configuredVideoCount > 0 &&
    selectedStatics.length > 0;
  const dirty = currentSnapshot !== savedSnapshot;

  function assignCarousel(designName: string, family: string) {
    setMessage(null);
    setError(null);
    setSelectedCarousels((current) =>
      current.includes(designName) ? current : [...current, designName],
    );
    setCarouselFamilies((current) => {
      const values = current[designName] ?? [];
      return values.includes(family)
        ? current
        : { ...current, [designName]: [...values, family] };
    });
  }
  function removeCarouselFamily(designName: string, family: string) {
    const remaining = (carouselFamilies[designName] ?? []).filter(
      (value) => value !== family,
    );
    setCarouselFamilies((current) => ({ ...current, [designName]: remaining }));
  }
  function removeCarousel(designName: string) {
    setSelectedCarousels((current) =>
      current.filter((name) => name !== designName),
    );
    setCarouselFamilies((current) => {
      const next = { ...current };
      delete next[designName];
      return next;
    });
    setFocusedDesign((current) => (current === designName ? null : current));
  }
  function toggleVideoFamily(family: string) {
    setVideoFonts((current) =>
      current[family]?.length
        ? { ...current, [family]: [] }
        : { ...current, [family]: ["Inter"] },
    );
  }
  function toggleVideoFont(family: string, font: string) {
    setVideoFonts((current) => {
      const values = current[family] ?? [];
      return {
        ...current,
        [family]: values.includes(font)
          ? values.filter((item) => item !== font)
          : [...values, font],
      };
    });
  }

  function discardChanges() {
    if (!savedSnapshot) return;
    const saved = JSON.parse(savedSnapshot) as {
      selectedCarousels: string[];
      carouselFamilies: Record<string, string[]>;
      videoFonts: Record<string, string[]>;
      selectedStatics: string[];
    };
    setSelectedCarousels(saved.selectedCarousels);
    setCarouselFamilies(saved.carouselFamilies);
    setVideoFonts(saved.videoFonts);
    setSelectedStatics(saved.selectedStatics);
    setFocusedDesign(null);
    setActiveDrag(null);
    setError(null);
    setMessage("Cambios descartados.");
  }

  async function save() {
    if (previewData) {
      setSavedSnapshot(currentSnapshot);
      setMessage("Vista de prueba guardada correctamente.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const templatesResponse = await fetch(
        `/api/admin/clientes/${clientId}/templates`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templates: selectedCarousels }),
        },
      );
      const templatesResult = (await templatesResponse.json()) as {
        error?: string;
        warning?: string;
      };
      if (!templatesResponse.ok)
        throw new Error(
          templatesResult.error ?? "No se pudieron asignar los carruseles",
        );
      const designsResponse = await fetch(
        `/api/admin/clientes/${clientId}/content-designs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            carousels: selectedCarousels
              .filter(
                (designName) => (carouselFamilies[designName]?.length ?? 0) > 0,
              )
              .map((designName) => ({
                designName,
                families: carouselFamilies[designName],
              })),
            videos: Object.entries(videoFonts)
              .filter(([, fonts]) => fonts.length > 0)
              .map(([family, typographyIds]) => ({ family, typographyIds })),
            statics: selectedStatics,
          }),
        },
      );
      const designsResult = (await designsResponse.json()) as {
        error?: string;
      };
      if (!designsResponse.ok)
        throw new Error(
          designsResult.error ?? "No se pudo guardar la configuración visual",
        );
      setMessage(
        templatesResult.warning
          ? "Configuración guardada. Drive quedó pendiente de sincronización."
          : "Calendario visual guardado y listo para generar.",
      );
      await load(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo guardar la configuración visual",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <p style={{ color: "var(--piedra)", fontSize: 16 }}>
        Preparando el calendario visual de {clientName}…
      </p>
    );
  if (!bank || !studio)
    return (
      <EmptyState>{error ?? "No se pudo abrir el armador visual."}</EmptyState>
    );

  return (
    <div className="font-sans" style={{ display: "grid", gap: 18 }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Bangers&family=Inter:wght@500;700;800&family=Montserrat:wght@500;700;800&family=Oswald:wght@500;700&family=Playfair+Display:wght@600;700&display=swap"
      />
      <style>{`.studio-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.week-composition{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:6px}.studio-overview{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.carousel-workspace{display:grid;grid-template-columns:minmax(230px,.68fr) minmax(0,1.32fr);gap:16px;align-items:start}.carousel-library{position:sticky;top:16px;max-height:calc(100vh - 120px);overflow:auto}.family-grid,.static-families{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.video-card{display:grid;grid-template-columns:minmax(180px,.72fr) minmax(280px,1.28fr);gap:18px}.static-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,220px));gap:11px}@media(max-width:900px){.week-composition{grid-template-columns:repeat(5,minmax(0,1fr))}.carousel-workspace{grid-template-columns:1fr}.carousel-library{position:static;max-height:none}.carousel-library-list{display:grid!important;grid-template-columns:repeat(auto-fill,minmax(210px,1fr))}.video-card{grid-template-columns:1fr}}@media(max-width:700px){.studio-tabs{grid-template-columns:repeat(2,minmax(0,1fr))}.studio-overview,.family-grid,.static-families{grid-template-columns:1fr}.week-composition{grid-template-columns:repeat(2,minmax(0,1fr))}.studio-footer{position:static!important;align-items:stretch!important;flex-direction:column}.studio-footer-actions{justify-content:flex-end}}`}</style>

      <section
        style={{
          border: "1px solid var(--linea)",
          background: "var(--nieve)",
          borderRadius: 20,
          padding: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                color: "var(--piedra)",
                fontSize: 13,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: ".1em",
              }}
            >
              {calendarCode} · Calendario visual
            </div>
            <h3 className="font-display font-semibold text-3xl" style={{ margin: "5px 0 2px" }}>
              {clientName}
            </h3>
            <p style={{ color: "var(--piedra)", fontSize: 15, margin: 0 }}>
              {calendarName}. Elegí qué aspecto tendrá cada tipo de contenido.
            </p>
          </div>
          <StatusBadge ready={ready} />
        </div>
      </section>

      <nav
        className="studio-tabs"
        aria-label="Pasos para armar el calendario visual"
      >
        {TABS.map((item) => {
          const active = tab === item.key;
          const itemReady =
            item.key === "carruseles"
              ? configuredCarouselFamilies > 0
              : item.key === "videos"
                ? configuredVideoCount > 0
                : item.key === "estaticas"
                  ? selectedStatics.length > 0
                  : ready;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              style={{
                textAlign: "left",
                border: `1px solid ${active ? "var(--cardon-tenue)" : "var(--linea)"}`,
                background: "var(--nieve)",
                borderRadius: 13,
                padding: "12px 13px",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  color: active ? "var(--cardon)" : "var(--piedra)",
                  fontSize: 12,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                }}
              >
                <span>{item.step}</span>
                {item.key !== "resumen" && itemReady && <span>✓</span>}
              </span>
              <span
                style={{
                  display: "block",
                  color: active ? "var(--tinta)" : "var(--piedra)",
                  fontSize: 15,
                  fontWeight: 750,
                  marginTop: 3,
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {tab === "resumen" && (
        <Overview
          configuredCarouselFamilies={configuredCarouselFamilies}
          configuredVideoCount={configuredVideoCount}
          selectedStaticCount={selectedStatics.length}
          setTab={setTab}
        />
      )}

      {tab === "carruseles" && (
        <section style={{ display: "grid", gap: 14 }}>
          <div>
            <h3 className="font-display font-semibold" style={{ color: "var(--tinta)", fontSize: 20, margin: 0 }}>
              Asigná un diseño a cada temática
            </h3>
            <p style={{ color: "var(--piedra)", fontSize: 14, margin: "5px 0 0" }}>
              Arrastrá un diseño desde la biblioteca hacia una temática. El
              texto lo define la temática; el diseño define cómo se ve.
            </p>
          </div>
          {pendingCarouselNames.length > 0 && (
            <div
              style={{
                border: "1px solid var(--linea)",
                background: "var(--nieve)",
                borderRadius: 16,
                padding: 13,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "start",
                  marginBottom: 10,
                }}
              >
                <div>
                  <strong style={{ color: "var(--tinta)", fontSize: 15 }}>
                    Ya cargados para este cliente
                  </strong>
                  <div style={{ color: "var(--piedra)", fontSize: 13, marginTop: 3 }}>
                    No se perdió nada. Solo falta indicar para qué temática
                    puede usar cada diseño.
                  </div>
                </div>
                <span style={{ color: "var(--tinta)", fontSize: 13 }}>
                  {pendingCarouselNames.length}
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {pendingCarouselNames.map((name) => {
                  const template = templateByName.get(name);
                  if (!template) return null;
                  return (
                    <div
                      key={name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        border: "1px solid var(--linea)",
                        background: "var(--nieve)",
                        borderRadius: 12,
                        padding: 7,
                      }}
                    >
                      <DesignMiniature
                        template={template}
                        logoUrl={bank.client.logoUrl}
                      />
                      <div>
                        <strong
                          style={{
                            color: "var(--tinta)",
                            fontSize: 13,
                            display: "block",
                          }}
                        >
                          {prettyDesignName(name)}
                        </strong>
                        <button
                          type="button"
                          onClick={() => {
                            setFocusedDesign(name);
                            setMessage(
                              "Elegí abajo la temática para este diseño.",
                            );
                          }}
                          style={{
                            border: 0,
                            background: "transparent",
                            color: "var(--tinta)",
                            fontSize: 12,
                            padding: "6px 8px 0 0",
                            cursor: "pointer",
                          }}
                        >
                          Asignar temática →
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCarousel(name)}
                          style={{
                            border: 0,
                            background: "transparent",
                            color: "var(--piedra)",
                            fontSize: 12,
                            padding: "6px 0 0",
                            cursor: "pointer",
                          }}
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="carousel-workspace">
            <aside
              className="carousel-library surface-card"
              style={{
                borderRadius: 17,
                padding: 16,
                boxShadow: "none", // flat look for library container
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  alignItems: "center",
                  marginBottom: 11,
                }}
              >
                <div>
                  <strong style={{ color: "var(--tinta)", fontSize: 15 }}>
                    Biblioteca de diseños
                  </strong>
                  <div style={{ color: "var(--piedra)", fontSize: 12, marginTop: 2 }}>
                    Abrí el preview y después asignalo a una temática
                  </div>
                </div>
                <span style={{ color: "var(--piedra)", fontSize: 13, background: "var(--blanco-piedra)", padding: "4px 8px", borderRadius: 12 }}>
                  {filteredLibrary.length}
                </span>
              </div>
              <input
                type="search"
                placeholder="Buscar por nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--linea)",
                  background: "var(--nieve)",
                  color: "var(--tinta)",
                  fontSize: 14,
                  marginBottom: 12,
                  outline: "none",
                }}
              />
              <div
                className="carousel-library-list"
                style={{ display: "grid", gap: 8, maxHeight: 500, overflowY: "auto", paddingRight: 4, margin: "0 -4px", padding: "0 4px" }}
              >
                {filteredLibrary.length === 0 ? (
                  <EmptyState>
                    No hay diseños que coincidan con la búsqueda.
                  </EmptyState>
                ) : (
                  filteredLibrary.map((template) => {
                    const active =
                      focusedDesign === template.name ||
                      activeDrag === template.name;
                    const uses = (carouselFamilies[template.name] ?? []).length;
                    const installed = selectedCarousels.includes(template.name);
                    const select = () =>
                      setFocusedDesign((current) =>
                        current === template.name ? null : template.name,
                      );
                    return (
                      <article
                        key={template.id}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData(
                            "text/plain",
                            template.name,
                          );
                          event.dataTransfer.effectAllowed = "copy";
                          setActiveDrag(template.name);
                        }}
                        onDragEnd={() => setActiveDrag(null)}
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                          width: "100%",
                          border: `1px solid ${active ? "var(--cardon)" : "var(--linea)"}`,
                          boxShadow: active ? "none" : "var(--sombra-reposo)",
                          background: active
                            ? "var(--cardon-tenue)"
                            : "var(--nieve)",
                          borderRadius: 13,
                          padding: 8,
                          cursor: "grab",
                          textAlign: "left",
                        }}
                      >
                        <DesignMiniature
                          template={template}
                          logoUrl={bank.client.logoUrl}
                          onPreview={() => setPreviewTemplate(template)}
                        />
                        <button
                          type="button"
                          onClick={select}
                          aria-pressed={active}
                          style={{
                            minWidth: 0,
                            flex: 1,
                            border: 0,
                            background: "transparent",
                            padding: "4px 2px",
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                        >
                          <strong
                            style={{
                              color: "var(--tinta)",
                              fontSize: 14,
                              display: "block",
                            }}
                          >
                            {prettyDesignName(template.name)}
                          </strong>
                          <span
                            style={{
                              color: uses
                                ? "var(--tinta)"
                                : installed
                                  ? "var(--tinta)"
                                  : "var(--piedra)",
                              fontSize: 12,
                              display: "block",
                              marginTop: 5,
                            }}
                          >
                            {uses
                              ? `Usado en ${uses} temática${uses === 1 ? "" : "s"}`
                              : installed
                                ? "Cargado · falta temática"
                                : "Disponible"}
                          </span>
                          <span
                            style={{
                              color: active ? "var(--tinta)" : "var(--piedra)",
                              fontSize: 12,
                              display: "block",
                              marginTop: 7,
                            }}
                          >
                            {active
                              ? "Ahora elegí una temática →"
                              : "Elegir este diseño"}
                          </span>
                        </button>
                      </article>
                    );
                  })
                )}
              </div>
            </aside>
            <div className="family-grid">
              {CAROUSEL_FAMILY_OPTIONS.map((family) => {
                const assigned = familyAssignments[family.key];
                const canAssign = Boolean(focusedDesign || activeDrag);
                return (
                  <article
                    key={family.key}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "copy";
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const name = event.dataTransfer.getData("text/plain");
                      if (name) assignCarousel(name, family.key);
                      setActiveDrag(null);
                    }}
                    onClick={() => {
                      if (focusedDesign) {
                        assignCarousel(focusedDesign, family.key);
                        setFocusedDesign(null);
                      }
                    }}
                    className="surface-card"
                    style={{
                      minHeight: 176,
                      border: `1px ${assigned.length ? "solid var(--linea)" : "dashed var(--linea)"}`,
                      background: canAssign
                        ? "var(--cardon-tenue)"
                        : "var(--nieve)",
                      borderRadius: 16,
                      padding: 16,
                      boxShadow: assigned.length ? "var(--sombra-reposo)" : "none",
                      cursor: focusedDesign ? "copy" : "default",
                    }}
                  >
                    <div
                      style={{ display: "flex", gap: 10, alignItems: "center" }}
                    >
                      <FamilySymbol kind={family.key} />
                      <div>
                        <strong style={{ color: "var(--tinta)", fontSize: 15 }}>
                          {family.label}
                        </strong>
                        <div
                          style={{
                            color: "var(--piedra)",
                            fontSize: 12,
                            marginTop: 3,
                          }}
                        >
                          {family.hint}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gap: 7, marginTop: 13 }}>
                      {assigned.map((name) => {
                        const template = templateByName.get(name);
                        if (!template) return null;
                        return (
                          <div
                            key={name}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              border: "1px solid var(--linea)",
                              background: "var(--nieve)",
                              boxShadow: "var(--sombra-reposo)",
                              borderRadius: 11,
                              padding: 7,
                            }}
                          >
                            <DesignMiniature
                              template={template}
                              logoUrl={bank.client.logoUrl}
                            />
                            <span
                              style={{
                                color: "var(--piedra)",
                                fontSize: 13,
                                flex: 1,
                              }}
                            >
                              {prettyDesignName(name)}
                            </span>
                            <button
                              type="button"
                              aria-label={`Quitar ${prettyDesignName(name)} de ${family.label}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                removeCarouselFamily(name, family.key);
                              }}
                              style={{
                                border: 0,
                                background: "transparent",
                                color: "var(--piedra)",
                                cursor: "pointer",
                                fontSize: 17,
                              }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                              </button>
                          </div>
                        );
                      })}
                      {assigned.length === 0 && (
                        <div
                          style={{
                            minHeight: 65,
                            display: "grid",
                            placeItems: "center",
                            border: "1px dashed var(--piedra-clara)",
                            borderRadius: 11,
                            color: canAssign ? "var(--tinta)" : "var(--piedra)",
                            fontSize: 13,
                          }}
                        >
                          {canAssign
                            ? "Tocá acá para asignar"
                            : "Soltá un diseño acá"}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {tab === "videos" && (
        <section style={{ display: "grid", gap: 14 }}>
          <div>
            <h3 style={{ color: "var(--tinta)", fontSize: 18, margin: 0 }}>
              Definí la voz visual de cada video
            </h3>
            <p style={{ color: "var(--piedra)", fontSize: 14, margin: "5px 0 0" }}>
              Activá las familias que tendrá el calendario. Podés elegir varias
              tipografías para que roten.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
            {VIDEO_FAMILY_OPTIONS.map((family) => {
              const selected = videoFonts[family.key] ?? [];
              const active = selected.length > 0;
              const selectedStack =
                VIDEO_TYPOGRAPHY_OPTIONS.find(
                  (item) => item.key === selected[0],
                )?.stack ?? "Inter, sans-serif";
              return (
                <article
                  className="video-card surface-card"
                  key={family.key}
                  style={{
                    border: `1px solid ${active ? "var(--cardon)" : "var(--linea)"}`,
                    background: "var(--nieve)",
                    borderRadius: 16,
                    padding: 16,
                    opacity: active ? 1 : 0.8,
                    boxShadow: active ? "var(--sombra-reposo)" : "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          color: "var(--cardon)",
                          fontSize: 13,
                          fontWeight: 800,
                          textTransform: "uppercase",
                        }}
                      >
                        {family.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleVideoFamily(family.key)}
                        style={{
                          border: `1px solid ${active ? "var(--cardon-tenue)" : "var(--linea)"}`,
                          background: active
                            ? "var(--cardon-tenue)"
                            : "transparent",
                          color: active ? "var(--cardon)" : "var(--piedra)",
                          borderRadius: 999,
                          padding: "5px 8px",
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        {active ? "✓ Incluida" : "+ Incluir"}
                      </button>
                    </div>
                    <div
                      style={{
                        color: "var(--tinta)",
                        fontSize: 20,
                        lineHeight: 1.13,
                        marginTop: 17,
                        maxWidth: 330,
                        fontFamily: selectedStack,
                      }}
                    >
                      {family.sample}
                    </div>
                    <div
                      style={{ color: "var(--piedra)", fontSize: 13, marginTop: 10 }}
                    >
                      {family.hint}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        color: "var(--piedra)",
                        fontSize: 12,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        marginBottom: 8,
                      }}
                    >
                      Tipografías que pueden rotar
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit,minmax(125px,1fr))",
                        gap: 7,
                      }}
                    >
                      {VIDEO_TYPOGRAPHY_OPTIONS.map((font) => {
                        const chosen = selected.includes(font.key);
                        return (
                          <button
                            key={font.key}
                            type="button"
                            disabled={!active}
                            onClick={() =>
                              toggleVideoFont(family.key, font.key)
                            }
                            style={{
                              border: `1px solid ${chosen ? "var(--tinta)" : "var(--linea)"}`,
                              background: "var(--nieve)",
                              boxShadow: chosen ? "0 0 0 1px var(--tinta)" : "none",
                              transition: "all 0.2s ease",
                              borderRadius: 12,
                              padding: "8px 12px",
                              textAlign: "left",
                              cursor: active ? "pointer" : "not-allowed",
                              opacity: active ? 1 : 0.5,
                            }}
                          >
                            <span
                              style={{
                                color: "var(--tinta)",
                                fontSize: 15,
                                fontFamily: font.stack,
                                fontWeight: chosen ? 600 : 400,
                              }}
                            >
                              {font.key}
                            </span>
                            <span
                                style={{
                                  display: "block",
                                  color: chosen ? "var(--tinta)" : "var(--piedra)",
                                  fontSize: 11,
                                  marginTop: 2,
                                }}
                              >
                                {font.mood}
                              </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {tab === "estaticas" && (
        <section style={{ display: "grid", gap: 17 }}>
          <div>
            <h3 style={{ color: "var(--tinta)", fontSize: 18, margin: 0 }}>
              Elegí banners y flyers por función
            </h3>
            <p style={{ color: "var(--piedra)", fontSize: 14, margin: "5px 0 0" }}>
              Los diseños están separados por el trabajo que cumplen. Así sabés
              cuándo puede aparecer cada uno.
            </p>
          </div>
          {staticGroups.length === 0 ? (
            <EmptyState>
              Todavía no hay banners o flyers aprobados en el laboratorio
              creativo.
            </EmptyState>
          ) : (
            <div className="static-families">
              {staticGroups.map((group) => (
                <article
                  key={group.mold}
                  style={{
                    border: "1px solid var(--linea)",
                    background: "var(--nieve)",
                    borderRadius: 17,
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: "var(--tinta)",
                          fontSize: 15,
                          fontWeight: 800,
                        }}
                      >
                        {group.info.label}
                      </div>
                      <div
                        style={{ color: "var(--piedra)", fontSize: 13, marginTop: 4 }}
                      >
                        {group.info.hint}
                      </div>
                    </div>
                    <span style={{ color: "var(--piedra)", fontSize: 12 }}>
                      {
                        group.designs.filter((design) =>
                          selectedStatics.includes(design.id),
                        ).length
                      }{" "}
                      elegidos
                    </span>
                  </div>
                  <div className="static-grid">
                    {group.designs.map((design) => {
                      const active = selectedStatics.includes(design.id);
                      return (
                        <button
                          key={design.id}
                          type="button"
                          onClick={() =>
                            setSelectedStatics((current) =>
                              current.includes(design.id)
                                ? current.filter((id) => id !== design.id)
                                : [...current, design.id],
                            )
                          }
                          style={{
                            border: active ? "1px solid var(--tinta)" : "1px solid var(--linea)",
                            background: "var(--nieve)",
                            boxShadow: active ? "0 0 0 1px var(--tinta)" : "none",
                            borderRadius: 14,
                            padding: 9,
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                        >
                          <div
                            style={{
                              aspectRatio: `${design.width} / ${design.height}`,
                              borderRadius: 10,
                              overflow: "hidden",
                              background: "var(--nieve)",
                              display: "grid",
                              placeItems: "center",
                            }}
                          >
                            <StaticPreview design={design} />
                          </div>
                          <div style={{ padding: "9px 2px 2px" }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 8,
                              }}
                            >
                              <strong
                                style={{ color: "var(--tinta)", fontSize: 14 }}
                              >
                                {prettyStaticName(design.template_id)}
                              </strong>
                              <span
                                style={{
                                  color: active ? "var(--tinta)" : "var(--piedra)",
                                  fontSize: 12,
                                }}
                              >
                                {active ? "✓ Activo" : "+ Elegir"}
                              </span>
                            </div>
                            <div
                              style={{
                                color: "var(--piedra)",
                                fontSize: 12,
                                marginTop: 5,
                              }}
                            >
                              {design.piece_type === "flyer"
                                ? "Flyer"
                                : "Banner"}{" "}
                              · {design.width} × {design.height}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          logoUrl={bank.client.logoUrl}
          onClose={() => setPreviewTemplate(null)}
        />
      )}

      <div
        className="studio-footer"
        style={{
          position: "sticky",
          bottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          border: "1px solid rgba(0,0,0,0.06)",
          background: "rgba(250, 250, 247, 0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderRadius: 18,
          padding: "14px 18px",
          boxShadow: "var(--sombra-alta)",
          zIndex: 100,
          marginTop: 20,
        }}
      >
        <span
          role={error ? "alert" : undefined}
          style={{
            color: error
              ? "#be123c"
              : message
                ? "var(--cardon)"
                : dirty
                  ? "var(--tinta)"
                  : "var(--piedra)",
            fontSize: 14,
            fontWeight: error || message || dirty ? 600 : 500,
          }}
        >
          {error ??
            message ??
            (dirty
              ? "Tenés cambios sin guardar"
              : ready
                ? "Calendario visual listo"
                : "Completá al menos una opción de cada paso")}
        </span>
        <div
          className="studio-footer-actions"
          style={{ display: "flex", gap: 8, alignItems: "center" }}
        >
          {dirty && (
            <button
              type="button"
              onClick={discardChanges}
              disabled={saving}
              style={{
                border: "1px solid var(--linea)",
                borderRadius: 10,
                padding: "9px 12px",
                background: "transparent",
                color: "var(--piedra)",
                fontSize: 13,
                fontWeight: 750,
                cursor: "pointer",
              }}
            >
              Descartar
            </button>
          )}
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !dirty}
            className="btn btn-cardon"
            style={{
              border: 0,
              borderRadius: 10,
              padding: "10px 15px",
              background: "var(--cardon)",
              color: "var(--nieve)",
              fontSize: 14,
              fontWeight: 850,
              cursor: saving ? "wait" : dirty ? "pointer" : "default",
              opacity: saving || !dirty ? 0.52 : 1,
            }}
          >
            {saving ? "Guardando…" : "Guardar calendario visual"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Overview({
  configuredCarouselFamilies,
  configuredVideoCount,
  selectedStaticCount,
  setTab,
}: {
  configuredCarouselFamilies: number;
  configuredVideoCount: number;
  selectedStaticCount: number;
  setTab: (tab: StudioTab) => void;
}) {
  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          border: "1px solid var(--linea)",
          background: "var(--nieve)",
          borderRadius: 18,
          padding: 17,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "baseline",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h3 className="font-display font-semibold" style={{ color: "var(--tinta)", fontSize: 19, margin: 0 }}>
              Semana base · 10 piezas
            </h3>
            <p style={{ color: "var(--piedra)", fontSize: 13, margin: "4px 0 0" }}>
              Esta es la mezcla visual que recibirá el cliente.
            </p>
          </div>
          <span style={{ color: "var(--piedra)", fontSize: 13 }}>
            5 videos · 3 carruseles · 2 banners/flyers
          </span>
        </div>
        <div className="week-composition" style={{ marginTop: 16 }}>
          {[...Array(5)].map((_, index) => (
            <WeekPiece
              key={`v-${index}`}
              label="VIDEO"
              number={index + 1}
              color="var(--cardon)"
            />
          ))}
          {[...Array(3)].map((_, index) => (
            <WeekPiece
              key={`c-${index}`}
              label="CARRUSEL"
              number={index + 6}
              color="var(--cardon)"
            />
          ))}
          {[...Array(2)].map((_, index) => (
            <WeekPiece
              key={`s-${index}`}
              label="FLYER"
              number={index + 9}
              color="var(--cardon)"
            />
          ))}
        </div>
      </div>
      <div className="studio-overview">
        {[
          {
            key: "carruseles" as const,
            title: "Carruseles",
            value: `${configuredCarouselFamilies} temáticas activas`,
            detail: "Asigná diseños según el tipo de copy.",
            accent: "var(--cardon)",
            done: configuredCarouselFamilies > 0,
          },
          {
            key: "videos" as const,
            title: "Videos",
            value: `${configuredVideoCount} familias activas`,
            detail: "Elegí la tipografía que corresponde a cada voz.",
            accent: "var(--cardon)",
            done: configuredVideoCount > 0,
          },
          {
            key: "estaticas" as const,
            title: "Banners y flyers",
            value: `${selectedStaticCount} diseños activos`,
            detail: "Seleccioná piezas aprobadas por función comercial.",
            accent: "var(--cardon)",
            done: selectedStaticCount > 0,
          },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            style={{
              border: `1px solid ${item.done ? `${item.accent}33` : "var(--linea)"}`,
              background: item.done ? `${item.accent}08` : "var(--nieve)",
              boxShadow: "var(--sombra-reposo)",
              borderRadius: 17,
              padding: 16,
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <strong style={{ color: "var(--tinta)", fontSize: 16 }}>
                {item.title}
              </strong>
              <StatusBadge ready={item.done} />
            </div>
            <div
              style={{
                color: item.accent,
                fontSize: 20,
                fontWeight: 800,
                marginTop: 25,
              }}
            >
              {item.value}
            </div>
            <p
              style={{
                color: "var(--piedra)",
                fontSize: 13,
                lineHeight: 1.5,
                margin: "6px 0 13px",
              }}
            >
              {item.detail}
            </p>
            <span style={{ color: "var(--piedra)", fontSize: 13 }}>Configurar →</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function WeekPiece({
  label,
  number,
  color,
}: {
  label: string;
  number: number;
  color: string;
}) {
  return (
    <div
      style={{
        minHeight: 74,
        borderRadius: 11,
        padding: 9,
        background: `${color}12`,
        border: `1px solid ${color}2c`,
      }}
    >
      <span style={{ color, fontSize: 12, fontWeight: 800 }}>{label}</span>
      <div style={{ color: "var(--piedra)", fontSize: 12, marginTop: 25 }}>
        Pieza {number}
      </div>
    </div>
  );
}
