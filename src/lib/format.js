// Dates UTC midnight par store hoti hain, isliye UTC se hi dikhate hain
export const formatDate = (d) => {
  if (!d) return "";
  const [y, m, day] = new Date(d).toISOString().slice(0, 10).split("-");
  return `${day}-${m}-${y}`;
};

export const todayStr = () => new Date().toISOString().slice(0, 10);
export const dateInput = (d) =>
  d ? new Date(d).toISOString().slice(0, 10) : "";
