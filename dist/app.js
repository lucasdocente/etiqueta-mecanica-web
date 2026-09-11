(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const STORAGE_KEY = 'etiqueta-mecanica-web-v1';
  const presets = [
    ['50 × 30 mm', 50, 30], ['60 × 40 mm', 60, 40],
    ['70 × 50 mm', 70, 50], ['80 × 50 mm', 80, 50],
    ['80 × 60 mm', 80, 60], ['80 × 80 mm', 80, 80],
    ['100 × 70 mm', 100, 70], ['Personalizado', null, null],
  ];
  const baseMaintenance = [
    'ÓLEO MOTOR', 'FILTRO DE ÓLEO', 'FILTRO DE AR',
    'FILTRO DE COMBUSTÍVEL', 'FILTRO DO AR-CONDICIONADO', 'FLUIDO DE FREIO',
    'LÍQUIDO DE ARREFECIMENTO', 'ÓLEO DO CÂMBIO', 'CORREIA DENTADA',
    'ALINHAMENTO E BALANCEAMENTO',
  ];
  const uid = () => globalThis.crypto?.randomUUID?.() ||
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  let maintenance = baseMaintenance.map((name, index) => ({
    id: uid(), name, value: '', enabled: index < 5, custom: false,
  }));
  let templates = [];
  let previewUrl = null;
  let previewTimer = null;
  let toastTimer = null;

  function loadStorage() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (Array.isArray(saved.templates)) templates = saved.templates.slice(0, 5);
      if (saved.workshop) $('workshop').value = saved.workshop;
      if (saved.contact) $('contact').value = saved.contact;
    } catch (_) { templates = []; }
  }
  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      workshop: $('workshop').value, contact: $('contact').value, templates,
    }));
  }
  function toast(message) {
    const element = $('toast'); element.textContent = message; element.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => element.classList.remove('show'), 2600);
  }
  function formatNumber(value) { return Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 }); }
  function kmDigits(value) { return String(value || '').replace(/\D/g, ''); }
  function formatKmNumber(value) {
    const digits = kmDigits(value);
    return digits ? Number(digits).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '';
  }
  function formatCurrentKm(value) {
    const formatted = formatKmNumber(value);
    return formatted ? `KM ${formatted}` : '';
  }
  function formatFutureKm(value) {
    return `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} KM`;
  }
  function normalizeMaintenanceName(value) {
    const name = String(value || '').trim();
    if (name.toLocaleUpperCase('pt-BR') === 'TROCA DE ÓLEO DO MOTOR') return 'ÓLEO MOTOR';
    return name.toLocaleUpperCase('pt-BR');
  }
  function normalizeMaintenanceValue(value) {
    const valueText = String(value || '').trim();
    if (!valueText || /[\/-]/.test(valueText) || !/^(?:KM\s*)?[\d.\s]+(?:\s*KM)?$/i.test(valueText)) return valueText;
    const formatted = formatKmNumber(valueText);
    return formatted ? `${formatted} KM` : valueText;
  }
  function updateAutomaticMaintenance() {
    const current = Number(kmDigits($('currentKm').value));
    if (!current) return;
    const automaticValue = formatFutureKm(current + 5000);
    maintenance.forEach(item => {
      const name = normalizeMaintenanceName(item.name);
      if (name === 'ÓLEO MOTOR' || name === 'FILTRO DE ÓLEO') {
        item.name = name;
        item.value = automaticValue;
        item.enabled = true;
      }
    });
    renderMaintenance();
  }
  function selectedOrientation() { return document.querySelector('[name=orientation]:checked').value; }
  function validateDimensions(showMessage = true) {
    const width = Number($('width').value), height = Number($('height').value);
    const valid = width >= 20 && width <= 120 && height >= 20 && height <= 120;
    if (!valid && showMessage) toast('Largura e altura devem ficar entre 20 e 120 mm.');
    return valid;
  }
  function collect() {
    return {
      width: Number($('width').value) || 50, height: Number($('height').value) || 70,
      workshop: $('workshop').value, contact: $('contact').value,
      customer: $('customer').value, plate: $('plate').value, vehicle: $('vehicle').value,
      serviceDate: $('serviceDate').value, currentKm: formatCurrentKm($('currentKm').value),
      notes: $('notes').value, maintenance: maintenance.map(item => ({
        ...item, name: normalizeMaintenanceName(item.name), value: normalizeMaintenanceValue(item.value),
      })),
    };
  }
  function schedulePreview() {
    clearTimeout(previewTimer); previewTimer = setTimeout(updatePreview, 130);
  }
  function updatePreview() {
    if (!validateDimensions(false)) return;
    const data = collect();
    $('previewSize').textContent = `${formatNumber(data.width)} × ${formatNumber(data.height)} mm`;
    const bytes = LabelPdf.build(data, 1);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const old = previewUrl; previewUrl = url;
    $('pdfPreview').src = `${url}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`;
    if (old) setTimeout(() => URL.revokeObjectURL(old), 1200);
  }
  function applyPreset() {
    const item = presets.find(p => p[0] === $('preset').value) || presets[3];
    const custom = item[1] === null;
    $('width').disabled = !custom; $('height').disabled = !custom;
    if (!custom) {
      const portrait = selectedOrientation() === 'portrait';
      $('width').value = portrait ? Math.min(item[1], item[2]) : Math.max(item[1], item[2]);
      $('height').value = portrait ? Math.max(item[1], item[2]) : Math.min(item[1], item[2]);
    }
    schedulePreview();
  }
  function renderMaintenance() {
    const list = $('maintenanceList'); list.replaceChildren();
    maintenance.forEach(item => {
      item.name = normalizeMaintenanceName(item.name);
      const row = document.createElement('div'); row.className = 'maintenance-row';
      const check = document.createElement('input'); check.type = 'checkbox'; check.className = 'check';
      check.checked = item.enabled; check.setAttribute('aria-label', `Incluir ${item.name}`);
      const name = document.createElement('input'); name.type = 'text'; name.value = item.name;
      name.placeholder = 'Nome da manutenção'; name.maxLength = 80;
      const value = document.createElement('input'); value.type = 'text'; value.value = item.value;
      value.placeholder = 'KM ou data'; value.maxLength = 50; value.className = 'maintenance-value';
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove-row';
      remove.textContent = '×'; remove.title = item.custom ? 'Remover campo' : 'Limpar campo';
      check.addEventListener('change', () => { item.enabled = check.checked; schedulePreview(); });
      name.addEventListener('input', () => {
        item.name = normalizeMaintenanceName(name.value); name.value = item.name;
        check.setAttribute('aria-label', `Incluir ${item.name}`); schedulePreview();
      });
      value.addEventListener('input', () => { item.value = value.value; schedulePreview(); });
      value.addEventListener('blur', () => {
        item.value = normalizeMaintenanceValue(value.value); value.value = item.value; schedulePreview();
      });
      remove.addEventListener('click', () => {
        if (item.custom) maintenance = maintenance.filter(entry => entry.id !== item.id);
        else { item.value = ''; item.enabled = false; }
        renderMaintenance(); schedulePreview();
      });
      row.append(check, name, value, remove); list.append(row);
    });
  }
  function refreshTemplates(selected = '') {
    const select = $('templateSelect'); select.replaceChildren(new Option('Novo modelo', ''));
    templates.forEach((template, index) => select.add(new Option(template.name, String(index))));
    select.value = selected; $('modelCounter').textContent = `${templates.length} de 5`;
  }
  function snapshot(name) {
    const fields = {};
    ['workshop','contact','customer','plate','vehicle','serviceDate','currentKm','notes'].forEach(id => fields[id] = $(id).value);
    return {
      name, preset: $('preset').value, orientation: selectedOrientation(),
      width: $('width').value, height: $('height').value,
      copies: Math.max(1, Math.min(100, Number($('copies').value) || 1)),
      fields, maintenance: maintenance.map(item => ({ ...item })),
    };
  }
  function commitTemplate(name, index = null) {
    if (index === null) templates.push(snapshot(name)); else templates[index] = snapshot(name);
    persist(); refreshTemplates(String(index === null ? templates.length - 1 : index));
    toast(`Modelo “${name}” salvo.`);
  }
  function requestSaveTemplate() {
    const selected = $('templateSelect').value;
    if (selected !== '') {
      const index = Number(selected), name = templates[index].name;
      if (confirm(`Atualizar o modelo “${name}” com as informações atuais?`)) commitTemplate(name, index);
      return;
    }
    if (templates.length >= 5) { toast('Limite de 5 modelos. Exclua ou atualize um modelo existente.'); return; }
    $('templateName').value = ''; $('nameDialog').showModal(); setTimeout(() => $('templateName').focus(), 50);
  }
  function loadTemplate() {
    if ($('templateSelect').value === '') { toast('Selecione um modelo salvo.'); return; }
    const template = templates[Number($('templateSelect').value)];
    $('preset').value = presets.some(item => item[0] === template.preset) ? template.preset : 'Personalizado';
    document.querySelector(`[name=orientation][value=${template.orientation || 'portrait'}]`).checked = true;
    applyPreset(); $('width').value = template.width; $('height').value = template.height;
    Object.entries(template.fields || {}).forEach(([id, value]) => { if ($(id)) $(id).value = value; });
    $('currentKm').value = formatCurrentKm($('currentKm').value);
    maintenance = Array.isArray(template.maintenance) ? template.maintenance.map(item => ({
      ...item, id: uid(), name: normalizeMaintenanceName(item.name), value: normalizeMaintenanceValue(item.value),
    })) : maintenance;
    updateAutomaticMaintenance();
    $('copies').value = Math.max(1, Math.min(100, Number(template.copies) || 1));
    renderMaintenance(); schedulePreview(); toast(`Modelo “${template.name}” carregado.`);
  }
  function deleteTemplate() {
    if ($('templateSelect').value === '') { toast('Selecione um modelo para excluir.'); return; }
    const index = Number($('templateSelect').value), name = templates[index].name;
    if (!confirm(`Excluir o modelo “${name}”?`)) return;
    templates.splice(index, 1); persist(); refreshTemplates(); toast('Modelo excluído.');
  }
  function resetService() {
    ['customer','plate','vehicle','serviceDate','currentKm','notes'].forEach(id => $(id).value = '');
    maintenance.forEach(item => item.value = ''); renderMaintenance(); schedulePreview(); toast('Dados do atendimento limpos.');
  }
  function generatePdf() {
    if (!validateDimensions()) return;
    const data = collect();
    if (!data.maintenance.some(item => item.enabled && item.name.trim() && item.value.trim()) &&
        ![data.customer,data.plate,data.vehicle,data.serviceDate,data.currentKm].some(value => value.trim())) {
      toast('Preencha ao menos uma informação ou manutenção.'); return;
    }
    const copies = Math.max(1, Math.min(100, Number($('copies').value) || 1));
    const blob = new Blob([LabelPdf.build(data, copies)], { type: 'application/pdf' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
    const plate = data.plate.trim().replace(/[^a-z0-9]/gi, '_');
    link.download = plate ? `etiqueta_${plate}.pdf` : 'etiqueta_termica.pdf';
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(link.href), 1500);
    persist(); toast(`PDF gerado com ${copies} ${copies === 1 ? 'cópia' : 'cópias'}.`);
  }
  function adjustCopies(delta) {
    $('copies').value = Math.max(1, Math.min(100, (Number($('copies').value) || 1) + delta));
  }

  presets.forEach(item => $('preset').add(new Option(item[0], item[0])));
  $('preset').value = '70 × 50 mm';
  loadStorage(); refreshTemplates(); renderMaintenance(); applyPreset();
  document.querySelectorAll('input,select,textarea').forEach(input => {
    if (!['templateSelect','templateName','copies'].includes(input.id) && input.name !== 'orientation') input.addEventListener('input', schedulePreview);
  });
  document.querySelectorAll('[name=orientation]').forEach(radio => radio.addEventListener('change', applyPreset));
  $('currentKm').addEventListener('input', () => {
    $('currentKm').value = formatCurrentKm($('currentKm').value);
    updateAutomaticMaintenance(); schedulePreview();
  });
  $('preset').addEventListener('change', applyPreset);
  $('addMaintenance').addEventListener('click', () => {
    maintenance.push({ id: uid(), name: 'NOVA MANUTENÇÃO', value: '', enabled: true, custom: true });
    renderMaintenance(); schedulePreview();
  });
  $('loadTemplate').addEventListener('click', loadTemplate);
  $('saveTemplate').addEventListener('click', requestSaveTemplate);
  $('deleteTemplate').addEventListener('click', deleteTemplate);
  $('confirmTemplate').addEventListener('click', event => {
    event.preventDefault(); const name = $('templateName').value.trim();
    if (!name) { toast('Informe um nome para o modelo.'); return; }
    const duplicate = templates.findIndex(item => item.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'));
    if (duplicate >= 0 && !confirm(`O modelo “${templates[duplicate].name}” já existe. Atualizá-lo?`)) return;
    commitTemplate(duplicate >= 0 ? templates[duplicate].name : name, duplicate >= 0 ? duplicate : null);
    $('nameDialog').close();
  });
  $('resetButton').addEventListener('click', resetService);
  $('generatePdf').addEventListener('click', generatePdf);
  $('minusCopy').addEventListener('click', () => adjustCopies(-1));
  $('plusCopy').addEventListener('click', () => adjustCopies(1));
  window.addEventListener('beforeunload', () => { persist(); if (previewUrl) URL.revokeObjectURL(previewUrl); });
  if (document.modelContext?.registerTool) {
    const lifecycle = new AbortController();
    Promise.resolve(document.modelContext.registerTool({
      name: 'read_label_configuration',
      title: 'Ler configuração da etiqueta',
      description: 'Retorna os dados atualmente preenchidos no gerador de etiqueta térmica.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute() { return { ...collect(), copies: Number($('copies').value) || 1 }; },
    }, { signal: lifecycle.signal })).catch(() => {});
    Promise.resolve(document.modelContext.registerTool({
      name: 'configure_thermal_label',
      title: 'Configurar etiqueta térmica',
      description: 'Preenche e atualiza a etiqueta térmica visível, incluindo formato, veículo e manutenções.',
      inputSchema: {
        type: 'object', additionalProperties: false,
        properties: {
          width: { type: 'number', minimum: 20, maximum: 120 },
          height: { type: 'number', minimum: 20, maximum: 120 },
          orientation: { type: 'string', enum: ['portrait', 'landscape'] },
          workshop: { type: 'string' }, contact: { type: 'string' },
          customer: { type: 'string' }, plate: { type: 'string' }, vehicle: { type: 'string' },
          serviceDate: { type: 'string' }, currentKm: { type: 'string' }, notes: { type: 'string' },
          maintenance: { type: 'array', items: { type: 'object', additionalProperties: false,
            properties: { name: { type: 'string' }, value: { type: 'string' }, enabled: { type: 'boolean' } },
            required: ['name', 'value'] } },
        },
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        if (!input || typeof input !== 'object') throw new Error('Configuração inválida.');
        if (input.width !== undefined || input.height !== undefined) {
          const width = Number(input.width ?? $('width').value), height = Number(input.height ?? $('height').value);
          if (width < 20 || width > 120 || height < 20 || height > 120) throw new Error('Dimensões fora do limite de 20 a 120 mm.');
          $('preset').value = 'Personalizado'; $('width').disabled = false; $('height').disabled = false;
          $('width').value = width; $('height').value = height;
        }
        if (input.orientation) document.querySelector(`[name=orientation][value=${input.orientation}]`).checked = true;
        ['workshop','contact','customer','plate','vehicle','serviceDate','currentKm','notes'].forEach(id => {
          if (input[id] !== undefined) $(id).value = String(input[id]);
        });
        if (Array.isArray(input.maintenance)) maintenance = input.maintenance.map(item => ({
          id: uid(), name: normalizeMaintenanceName(item.name), value: normalizeMaintenanceValue(item.value),
          enabled: item.enabled !== false, custom: true,
        }));
        $('currentKm').value = formatCurrentKm($('currentKm').value);
        updateAutomaticMaintenance();
        renderMaintenance(); schedulePreview();
        return { status: 'configured', width: Number($('width').value), height: Number($('height').value) };
      },
    }, { signal: lifecycle.signal })).catch(() => {});
    window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
  }
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {});
  schedulePreview();
})();
