#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const { Client } = require('pg');

const DAMAGE_TYPE_MAP = {
  phy: 'physical',
  physical: 'physical',
  mag: 'magical',
  magical: 'magical',
  tech: 'tech',
};

const PREFERRED_FILE = 'Fallen Warlord Undefeated Champion.yaml';

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const formatFeaturesHtml = (features) => {
  if (!Array.isArray(features) || !features.length) return null;
  return features
    .map((feature) => {
      const name = feature?.name ? String(feature.name).trim() : '';
      const type = feature?.type ? String(feature.type).trim() : '';
      const text = feature?.text ? String(feature.text).trim() : '';
      if (!name && !text) return null;
      const label = type ? `${name} - ${type}` : name;
      return `<p><strong><em>${escapeHtml(label)}: </em></strong>${escapeHtml(text)}</p>`;
    })
    .filter(Boolean)
    .join('');
};

const toExperienceString = (experiences) => {
  if (!Array.isArray(experiences) || !experiences.length) return null;
  return experiences
    .map((exp) => {
      const name = exp?.name ? String(exp.name).trim() : '';
      let modifier = '';
      if (typeof exp?.modifier === 'number' && Number.isFinite(exp.modifier)) {
        modifier = exp.modifier >= 0 ? `+${exp.modifier}` : String(exp.modifier);
      } else if (typeof exp?.modifier !== 'undefined') {
        const raw = String(exp.modifier).trim();
        if (raw && /^\d+$/.test(raw)) {
          modifier = `+${raw}`;
        } else {
          modifier = raw;
        }
      }
      return [name, modifier].filter(Boolean).join(' ');
    })
    .filter(Boolean)
    .join(', ');
};

const toThresholdTuple = (thresholds) => {
  if (Array.isArray(thresholds) && thresholds.length) {
    const entry = thresholds[0] ?? {};
    const major = entry.major ?? entry.Major;
    const severe = entry.severe ?? entry.Severe;
    if (typeof major !== 'undefined' || typeof severe !== 'undefined') {
      return [Number(major ?? 0) || 0, Number(severe ?? 0) || 0];
    }
  }
  return null;
};

const toAttackMeta = (rawAttack) => {
  if (!rawAttack) return {};
  if (Array.isArray(rawAttack) && rawAttack.length) {
    const meta = rawAttack[0];
    return {
      weapon: meta?.name ? String(meta.name).trim() : null,
      distance: meta?.type ? String(meta.type).trim().toLowerCase() : null,
      damageAmount: meta?.dmg ? String(meta.dmg).trim() : null,
      damageType: meta?.dmg_type
        ? DAMAGE_TYPE_MAP[String(meta.dmg_type).trim().toLowerCase()] || String(meta.dmg_type).trim()
        : null,
    };
  }
  if (typeof rawAttack === 'object') {
    return {
      weapon: rawAttack?.name ? String(rawAttack.name).trim() : null,
      distance: rawAttack?.type ? String(rawAttack.type).trim().toLowerCase() : null,
      damageAmount: rawAttack?.dmg ? String(rawAttack.dmg).trim() : null,
      damageType: rawAttack?.dmg_type
        ? DAMAGE_TYPE_MAP[String(rawAttack.dmg_type).trim().toLowerCase()] || String(rawAttack.dmg_type).trim()
        : null,
    };
  }
  return {};
};

const formatAttackModifier = (modifier) => {
  if (modifier === null || typeof modifier === 'undefined') return null;
  const numeric = Number(modifier);
  if (Number.isFinite(numeric)) {
    return numeric >= 0 ? `+${numeric}` : String(numeric);
  }
  return String(modifier).trim();
};

const normalizeYamlContent = (content) =>
  content
    .split(/\r?\n/)
    .map((line) => {
      const idx = line.indexOf(':');
      if (idx === -1) return line;
      const keyPart = line.slice(0, idx);
      const valuePart = line.slice(idx + 1);
      const trimmedValue = valuePart.trim();
      if (!trimmedValue || trimmedValue.startsWith('#')) return line;
      if (trimmedValue.startsWith('"') || trimmedValue.startsWith("'")) return line;
      if (!trimmedValue.includes(':')) return line;
      const leadingWhitespace = valuePart.slice(0, valuePart.length - trimmedValue.length);
      const escaped = trimmedValue.replace(/"/g, '\\"');
      return `${keyPart}:${leadingWhitespace}"${escaped}"`;
    })
    .join('\n');

const main = async () => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const baseDir = path.join(process.cwd(), 'public', 'yamls');
  const files = fs
    .readdirSync(baseDir)
    .filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'))
    .sort((a, b) => a.localeCompare(b));

  const ordered = [];
  if (files.includes(PREFERRED_FILE)) {
    ordered.push(PREFERRED_FILE);
  }
  for (const file of files) {
    // if (ordered.length >= 10) break;
    if (ordered.includes(file)) continue;
    ordered.push(file);
  }

  console.log('Processing files:', ordered);

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  const [{ rows: userRows }] = await Promise.all([
    client.query('SELECT id FROM users ORDER BY created_at ASC NULLS LAST LIMIT 1'),
  ]);

  if (!userRows.length) {
    console.error('No users found to associate adversaries with.');
    process.exit(1);
  }

  const userId = userRows[0].id;

  for (const file of ordered) {
    const absolute = path.join(baseDir, file);
    const content = fs.readFileSync(absolute, 'utf8');
    const normalizedContent = normalizeYamlContent(content);
    const data = yaml.parse(normalizedContent);

    const thresholds = toThresholdTuple(data.thresholds);
    const experiences = toExperienceString(data.experiences);
    const featuresHtml = formatFeaturesHtml(data.features);
    const { weapon, distance, damageAmount, damageType } = toAttackMeta(data.attack);
    const attackModifier = formatAttackModifier(data.att_mod);

    const payload = {
      name: data.name?.trim() || null,
      type: 'adversary',
      subtype: data.type ? String(data.type).trim().toLowerCase() : null,
      description: data.text ? String(data.text).trim() : null,
      subDescription: data.motives_tactics ? String(data.motives_tactics).trim() : null,
      tier: typeof data.tier !== 'undefined' ? Number(data.tier) || null : null,
      difficulty: typeof data.difficulty !== 'undefined' ? String(data.difficulty).trim() : null,
      hp: typeof data.hp !== 'undefined' ? Number(data.hp) || 0 : null,
      stress: typeof data.stress !== 'undefined' ? Number(data.stress) || 0 : null,
      thresholds,
      attack: attackModifier,
      weapon,
      distance,
      damageType,
      damageAmount,
      experience: experiences,
      text: featuresHtml,
    };

    const existing = await client.query(
      'SELECT id FROM adversary_previews WHERE name = $1 LIMIT 1',
      [payload.name],
    );

    let adversaryId;
    if (existing.rows.length) {
      adversaryId = existing.rows[0].id;
      await client.query(
        `UPDATE adversary_previews SET
          type = $2,
          subtype = $3,
          description = $4,
          sub_description = $5,
          tier = $6,
          difficulty = $7,
          hp = $8,
          stress = $9,
          thresholds = $10,
          attack = $11,
          weapon = $12,
          distance = $13,
          damage_type = $14,
          damage_amount = $15,
          experience = $16,
          text = $17
        WHERE id = $1`,
        [
          adversaryId,
          payload.type,
          payload.subtype,
          payload.description,
          payload.subDescription,
          payload.tier,
          payload.difficulty,
          payload.hp,
          payload.stress,
          payload.thresholds ? `(${payload.thresholds[0]},${payload.thresholds[1]})` : null,
          payload.attack,
          payload.weapon,
          payload.distance,
          payload.damageType,
          payload.damageAmount,
          payload.experience,
          payload.text,
        ],
      );
    } else {
      const insert = await client.query(
        `INSERT INTO adversary_previews
          (name, type, subtype, description, sub_description, tier, difficulty, hp, stress, thresholds, attack, weapon, distance, damage_type, damage_amount, experience, text)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        RETURNING id`,
        [
          payload.name,
          payload.type,
          payload.subtype,
          payload.description,
          payload.subDescription,
          payload.tier,
          payload.difficulty,
          payload.hp,
          payload.stress,
          payload.thresholds ? `(${payload.thresholds[0]},${payload.thresholds[1]})` : null,
          payload.attack,
          payload.weapon,
          payload.distance,
          payload.damageType,
          payload.damageAmount,
          payload.experience,
          payload.text,
        ],
      );
      adversaryId = insert.rows[0].id;
    }

    const link = await client.query(
      'SELECT id FROM user_adversaries WHERE user_id = $1 AND adversary_preview_id = $2 LIMIT 1',
      [userId, adversaryId],
    );

    if (!link.rows.length) {
      await client.query(
        'INSERT INTO user_adversaries (user_id, adversary_preview_id, public) VALUES ($1, $2, $3)',
        [userId, adversaryId, false],
      );
    }

    console.log(`Upserted adversary: ${payload.name} (${adversaryId})`);
  }

  await client.end();
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
