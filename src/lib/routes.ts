// Route catalog and Gamma country/channel seed data.
// Used as initial UI data; can be replaced by live data from the backend
// proxy ( GET /api/sms/available-routes?expand=gamma ).

export type RouteOption = {
  option_id: string;
  label: string;
  subtitle: string;
  family: "alpha" | "beta" | "epsilon" | "gamma";
};

export const ROUTE_CATALOG: RouteOption[] = [
  { option_id: "alpha",   label: "Route Alpha",   subtitle: "Worldwide · Premium worldwide delivery", family: "alpha" },
  { option_id: "beta",    label: "Route Beta",    subtitle: "Worldwide · Standard route",             family: "beta" },
  { option_id: "epsilon", label: "Route Epsilon", subtitle: "Worldwide · High deliverability",        family: "epsilon" },
  { option_id: "gamma",   label: "Route Gamma",   subtitle: "By country · Direct international",      family: "gamma" },
];

export const EPSILON_SUBROUTES = Array.from({ length: 13 }, (_, i) => ({
  option_id: `epsilon-ttsky-${i + 1}`,
  label: `TTSKY ${i + 1}`,
}));

export type GammaChannel = { option_id: string; name: string; price: number };
export type GammaCountry = {
  country: string;
  iso: string;
  dial: string;
  channels: GammaChannel[];
};

const ch = (country: string, code: string, price: number): GammaChannel => ({
  option_id: `gamma-${country.toLowerCase().replace(/\s+/g, "-")}-${code.toLowerCase()}`,
  name: code,
  price,
});

export const GAMMA_COUNTRIES: GammaCountry[] = [
  { country: "Australia", iso: "AU", dial: "+61", channels: [
    ch("Australia","CH6",0.07), ch("Australia","CH6-1",0.07), ch("Australia","CH6-2",0.07),
    ch("Australia","CH6-3",0.07), ch("Australia","CH6-4",0.07),
  ]},
  { country: "Austria", iso: "AT", dial: "+43", channels: [
    ch("Austria","CH12",0.06), ch("Austria","CH4",0.06), ch("Austria","CH7",0.06), ch("Austria","CH1",0.06),
  ]},
  { country: "Belgium", iso: "BE", dial: "+32", channels: [
    ch("Belgium","CH12",0.09), ch("Belgium","CH4",0.09),
    ch("Belgium","CH6",0.10), ch("Belgium","CH6-1",0.10), ch("Belgium","CH6-2",0.10),
    ch("Belgium","CH6-3",0.10), ch("Belgium","CH6-4",0.10), ch("Belgium","CH7",0.10),
  ]},
  { country: "Chile", iso: "CL", dial: "+56", channels: [
    ch("Chile","CH12",0.03), ch("Chile","CH6",0.03), ch("Chile","CH6-1",0.03), ch("Chile","CH6-2",0.03),
    ch("Chile","CH6-4",0.03), ch("Chile","CH4",0.03), ch("Chile","CH6-3",0.03),
  ]},
  { country: "Colombia", iso: "CO", dial: "+57", channels: [
    ch("Colombia","CH12",0.01), ch("Colombia","CH7",0.01),
  ]},
  { country: "Czech Republic", iso: "CZ", dial: "+420", channels: [
    ch("Czech","CH6",0.07), ch("Czech","CH6-2",0.07), ch("Czech","CH4",0.07),
    ch("Czech","CH6-1",0.07), ch("Czech","CH6-3",0.07), ch("Czech","CH6-4",0.07),
  ]},
  { country: "Denmark", iso: "DK", dial: "+45", channels: [
    ch("Denmark","CH12",0.07), ch("Denmark","CH6",0.07), ch("Denmark","CH6-1",0.07),
    ch("Denmark","CH6-2",0.07), ch("Denmark","CH6-3",0.07), ch("Denmark","CH6-4",0.07),
    ch("Denmark","CH1",0.07), ch("Denmark","CH11",0.08), ch("Denmark","CH4",0.08),
  ]},
  { country: "Estonia", iso: "EE", dial: "+372", channels: [
    ch("Estonia","CH11",0.07), ch("Estonia","CH4",0.07), ch("Estonia","CH6",0.07),
    ch("Estonia","CH6-1",0.07), ch("Estonia","CH6-2",0.07),
  ]},
  { country: "Finland", iso: "FI", dial: "+358", channels: [ ch("Finland","CH4",0.09) ]},
  { country: "France", iso: "FR", dial: "+33", channels: [
    ch("France","CH12",0.07), ch("France","CH4",0.07), ch("France","CH6",0.07),
    ch("France","CH6-1",0.07), ch("France","CH6-2",0.07), ch("France","CH6-3",0.07),
    ch("France","CH6-4",0.07), ch("France","CH7",0.07),
  ]},
  { country: "Germany", iso: "DE", dial: "+49", channels: [
    ch("Germany","CH12",0.09), ch("Germany","CH7",0.10),
    ch("Germany","CH11",0.11), ch("Germany","CH4",0.11), ch("Germany","CH6",0.11),
    ch("Germany","CH6-1",0.11), ch("Germany","CH6-2",0.11), ch("Germany","CH6-3",0.11),
    ch("Germany","CH6-4",0.11), ch("Germany","CH1",0.11),
  ]},
  { country: "Hong Kong", iso: "HK", dial: "+852", channels: [
    ch("HK","CH11",0.08), ch("HK","CH4",0.08), ch("HK","CH7",0.08),
  ]},
  { country: "Hungary", iso: "HU", dial: "+36", channels: [
    ch("Hungary","CH12",0.07), ch("Hungary","CH6",0.07), ch("Hungary","CH6-1",0.07),
    ch("Hungary","CH6-2",0.07), ch("Hungary","CH6-3",0.07), ch("Hungary","CH6-4",0.07),
  ]},
  { country: "Ireland", iso: "IE", dial: "+353", channels: [
    ch("Ireland","CH4",0.08), ch("Ireland","CH6",0.08), ch("Ireland","CH6-1",0.08),
    ch("Ireland","CH6-2",0.08), ch("Ireland","CH6-3",0.08), ch("Ireland","CH6-4",0.08),
    ch("Ireland","CH7",0.08),
  ]},
  { country: "Italy", iso: "IT", dial: "+39", channels: [
    ch("Italy","CH11",0.07), ch("Italy","CH4",0.07), ch("Italy","CH6",0.07),
    ch("Italy","CH6-1",0.07), ch("Italy","CH1",0.07), ch("Italy","CH7",0.07),
  ]},
  { country: "Kazakhstan", iso: "KZ", dial: "+7", channels: [
    ch("Kazakhstan","CH4",0.48), ch("Kazakhstan","CH6-2",0.48),
  ]},
  { country: "Latvia", iso: "LV", dial: "+371", channels: [
    ch("Latvia","CH4",0.07), ch("Latvia","CH7",0.07),
  ]},
  { country: "Lithuania", iso: "LT", dial: "+370", channels: [
    ch("Lithuania","CH6",0.07), ch("Lithuania","CH6-1",0.07), ch("Lithuania","CH4",0.07),
  ]},
  { country: "Mexico", iso: "MX", dial: "+52", channels: [
    ch("Mexico","CH12",0.02), ch("Mexico","CH4",0.02), ch("Mexico","CH6",0.02),
    ch("Mexico","CH6-1",0.02), ch("Mexico","CH6-2",0.02), ch("Mexico","CH6-3",0.02),
    ch("Mexico","CH6-4",0.02),
  ]},
  { country: "Netherlands", iso: "NL", dial: "+31", channels: [
    ch("Netherlands","CH12",0.09), ch("Netherlands","CH4",0.10), ch("Netherlands","CH6",0.10),
    ch("Netherlands","CH6-1",0.10), ch("Netherlands","CH6-2",0.10), ch("Netherlands","CH6-3",0.10),
    ch("Netherlands","CH6-4",0.10), ch("Netherlands","CH1",0.10), ch("Netherlands","CH11",0.10),
  ]},
  { country: "Norway", iso: "NO", dial: "+47", channels: [
    ch("Norway","CH12",0.08), ch("Norway","CH4",0.08), ch("Norway","CH6-4",0.08),
    ch("Norway","CH6",0.08), ch("Norway","CH7",0.08), ch("Norway","CH6-1",0.08),
    ch("Norway","CH6-2",0.08), ch("Norway","CH6-3",0.08),
  ]},
  { country: "Poland", iso: "PL", dial: "+48", channels: [
    ch("Poland","CH11",0.07), ch("Poland","CH12",0.07), ch("Poland","CH6",0.07),
    ch("Poland","CH6-1",0.07), ch("Poland","CH6-2",0.07), ch("Poland","CH6-3",0.07),
    ch("Poland","CH6-4",0.07), ch("Poland","CH7",0.07),
  ]},
  { country: "Portugal", iso: "PT", dial: "+351", channels: [
    ch("Portugal","CH4",0.05), ch("Portugal","CH7",0.05), ch("Portugal","CH11",0.05),
    ch("Portugal","CH11-1",0.05), ch("Portugal","CH6",0.05), ch("Portugal","CH6-1",0.05),
    ch("Portugal","CH6-2",0.05), ch("Portugal","CH6-4",0.05), ch("Portugal","CH1",0.05),
    ch("Portugal","CH6-3",0.06),
  ]},
  { country: "Romania", iso: "RO", dial: "+40", channels: [
    ch("Romania","CH4",0.07), ch("Romania","CH6",0.07), ch("Romania","CH6-1",0.07),
    ch("Romania","CH6-2",0.07), ch("Romania","CH6-4",0.07), ch("Romania","CH6-3",0.08),
  ]},
  { country: "Slovakia", iso: "SK", dial: "+421", channels: [
    ch("Slovakia","CH4",0.07), ch("Slovakia","CH6",0.07), ch("Slovakia","CH6-1",0.07),
    ch("Slovakia","CH6-2",0.07), ch("Slovakia","CH6-3",0.07), ch("Slovakia","CH6-4",0.07),
  ]},
  { country: "Spain", iso: "ES", dial: "+34", channels: [
    ch("Spain","CH11",0.07), ch("Spain","CH11-1",0.07), ch("Spain","CH12",0.07),
    ch("Spain","CH4",0.07), ch("Spain","CH6",0.07), ch("Spain","CH6-1",0.07),
    ch("Spain","CH6-2",0.07), ch("Spain","CH6-3",0.07), ch("Spain","CH6-4",0.07),
    ch("Spain","CH7",0.07), ch("Spain","CH1",0.07),
  ]},
  { country: "Sweden", iso: "SE", dial: "+46", channels: [
    ch("Sweden","CH11",0.08), ch("Sweden","CH12",0.08), ch("Sweden","CH4",0.08),
    ch("Sweden","CH6",0.08), ch("Sweden","CH6-2",0.08), ch("Sweden","CH6-3",0.08),
    ch("Sweden","CH6-4",0.08), ch("Sweden","CH1",0.08), ch("Sweden","CH6-1",0.08),
  ]},
  { country: "Switzerland", iso: "CH", dial: "+41", channels: [ ch("Switzerland","CH4",0.09) ]},
  { country: "Turkey", iso: "TR", dial: "+90", channels: [
    ch("Turkey","CH11",0.03), ch("Turkey","CH4",0.03),
  ]},
  { country: "United Kingdom", iso: "GB", dial: "+44", channels: [
    ch("UK","CH4",0.07), ch("UK","CH6",0.07), ch("UK","CH6-1",0.07),
    ch("UK","CH6-2",0.07), ch("UK","CH7",0.07), ch("UK","CH1",0.07),
    ch("UK","CH6-3",0.07), ch("UK","CH6-4",0.07),
  ]},
  { country: "United States", iso: "US", dial: "+1", channels: [
    ch("US","CH4",0.05), ch("US","CH6",0.05), ch("US","CH6-2",0.05),
    ch("US","CH6-3",0.05), ch("US","CH7",0.05),
  ]},
];
