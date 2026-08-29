export const BIRTHPLACE_OPTIONS = Object.freeze([
  "天水国国都",
  "炎武城",
  "火乌帝国",
  "红月城",
  "化神海",
  "圣域",
  "东海海域",
  "南域边境",
]);

export const BACKGROUND_OPTIONS = Object.freeze([
  "天水国寒门",
  "迦蓝学院学员",
  "镇国神卫军户",
  "术炼师公会学徒",
  "炎武城商户",
  "红月城武者世家",
  "化神海杂役",
  "海族流民",
  "妖族后裔",
  "魔族遗脉",
]);

const GENDER_PRESETS = new Set(["男", "女", "不记", "自定义"]);

export function resolveCharacterGender(preset, customGender = "") {
  const normalizedPreset = typeof preset === "string" ? preset.trim() : "";
  if (!GENDER_PRESETS.has(normalizedPreset)) {
    throw new Error("性别选项无效");
  }
  if (normalizedPreset !== "自定义") return normalizedPreset;
  const normalizedCustom = typeof customGender === "string" ? customGender.trim() : "";
  if (!normalizedCustom) throw new Error("请填写自定义性别");
  if (normalizedCustom.length > 20) throw new Error("自定义性别不能超过二十个字");
  return normalizedCustom;
}
