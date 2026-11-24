#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

// 1. Определяем root (директорию, из которой запустили скрипт)
const rootDir = process.cwd();
const contentDir = path.join(rootDir, 'content');
const pandocStuffDir = path.join(rootDir, 'pandoc stuff');

// 2. Пути к ресурсам Pandoc
const templatePath = path.join(pandocStuffDir, 'fmptemplate.html');
const themePath = path.join(pandocStuffDir, 'fmp.theme');

// 3. Проверка наличия ресурсов
if (!fs.existsSync(templatePath) || !fs.existsSync(themePath)) {
    console.error('Ошибка: не найдены fmptemplate.html или fmp.theme в папке "pandoc stuff".');
    process.exit(1);
}

// ANSI-цвета для консоли
const COLOR_YELLOW = '\x1b[33m';
const COLOR_GREEN = '\x1b[32m';
const COLOR_RESET = '\x1b[0m';

// Базовый префикс сайта (папка, в которой лежит content/)
const SITE_PREFIX = '/papyrus';

// 4. Парсинг аргументов вручную
const args = process.argv.slice(2);
let inputPath = null;
let onlyToday = false;
let agoMinutes = null;
let agoDays = null;
let keepName = false;
let convertAll = false;
let generateToc = false;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '-i' || args[i] === '--input') {
        if (i + 1 < args.length) {
            inputPath = args[i + 1];
            i++;
        }
    } else if (args[i] === '--today') {
        onlyToday = true;
    } else if (args[i] === '--ago') {
        if (i + 2 < args.length) {
            const unit = args[i + 1];
            const value = parseInt(args[i + 2], 10);

            if (unit === '-m' && !isNaN(value)) {
                agoMinutes = value;
            } else if (unit === '-d' && !isNaN(value)) {
                agoDays = value;
            }
            i += 2;
        }
    } else if (args[i] === '--keep-name') {
        keepName = true;
    } else if (args[i] === '--all') {
        convertAll = true;
    } else if (args[i] === '-g' || args[i] === '--generate-toc') {
        generateToc = true;
    }
}

// Если не передан ни один флаг, который требует работы — ничего не делаем
const hasAnyFlag = inputPath !== null || onlyToday || agoMinutes !== null || agoDays !== null || keepName || convertAll || generateToc;
if (!hasAnyFlag) {
    console.log('Не передано ни одного флага. Ничего не делаю.');
    console.log('Доступные флаги: -i/--input <path>, --today, --ago -m <minutes>, --ago -d <days>, --keep-name, --all, -g/--generate-toc');
    process.exit(0);
}

// Начало сегодняшнего дня в UTC
const today = new Date();
today.setUTCHours(0, 0, 0, 0);

/**
 * Рекурсивный поиск .md файлов (используется для папки content)
 */
function findMdFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        if (entry.name.startsWith('_')) {
            continue;
        }

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...findMdFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
            files.push(fullPath);
        }
    }
    return files;
}

/**
 * Проверка: изменен ли файл сегодня (с 00:00:00 UTC)
 */
function isModifiedToday(filePath) {
    const stats = fs.statSync(filePath);
    const fileDate = new Date(stats.mtime.getTime() - stats.mtime.getTimezoneOffset() * 60000);
    fileDate.setUTCHours(0, 0, 0, 0);
    return fileDate.getTime() === today.getTime();
}

/**
 * Проверка: изменен ли файл в течение заданного интервала (--ago)
 */
function isModifiedWithin(filePath, minutes, days) {
    const stats = fs.statSync(filePath);
    const fileTime = stats.mtimeMs;
    const now = Date.now();

    let threshold;
    if (minutes !== null) {
        threshold = now - (minutes * 60 * 1000);
    } else if (days !== null) {
        threshold = now - (days * 24 * 60 * 60 * 1000);
    } else {
        return false;
    }

    return fileTime >= threshold;
}

/**
 * Разбирает входной путь -i. 
 * Возвращает массив всех .md файлов внутри (рекурсию в папки внутри -i не делаем, только верхний уровень).
 */
function resolveInputPath(inputPath) {
    const stats = fs.statSync(inputPath);

    if (stats.isFile()) {
        if (!inputPath.endsWith('.md')) {
            console.error('Ошибка: указанный файл не имеет расширения .md');
            process.exit(1);
        }
        return [inputPath];
    }

    if (stats.isDirectory()) {
        const entries = fs.readdirSync(inputPath, { withFileTypes: true });
        const mdFiles = [];

        for (const entry of entries) {
            if (entry.isFile() && entry.name.endsWith('.md')) {
                mdFiles.push(path.join(inputPath, entry.name));
            }
        }

        if (mdFiles.length === 0) {
            console.error(`Ошибка: в указанной директории (${inputPath}) не найдено .md файлов.`);
            process.exit(1);
        }

        return mdFiles;
    }

    console.error('Ошибка: не удалось определить тип пути (не файл и не папка).');
    process.exit(1);
}

/**
 * Запускает Pandoc для одного файла
 */
function convertFile(sourcePath, useKeepNameLogic) {
    let outputFileName;

    if (useKeepNameLogic) {
        const baseName = path.basename(sourcePath, '.md');
        outputFileName = baseName + '.html';
    } else {
        outputFileName = 'index.html';
    }

    const outputPath = path.join(path.dirname(sourcePath), outputFileName);

    const args = [
        sourcePath,
        '-f', 'markdown+emoji',
        '-o', outputPath,
        `--template=${templatePath}`,
        `--syntax-highlighting=${themePath}`
    ];

    console.log(`Конвертирую: ${path.relative(rootDir, sourcePath)} -> ${path.relative(rootDir, outputPath)}`);

    execFile('pandoc', args, (error, stdout, stderr) => {
        if (error) {
            console.error(`Ошибка при конвертации ${sourcePath}: ${stderr || error.message}`);
            return;
        }
        if (stderr) {
            console.warn(`Предупреждение от Pandoc: ${stderr}`);
        }
    });
}

/**
 * Извлекает front matter из markdown-файла.
 * Поддерживает простой YAML-подобный формат (key: value, массивы в [ ... ]).
 * Возвращает объект с полями или null, если front matter не найден.
 */
function parseFrontMatter(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const normalized = content.replace(/\r\n/g, '\n');

    if (!normalized.startsWith('---\n')) {
        return null;
    }

    const endIndex = normalized.indexOf('\n---', 4);
    if (endIndex === -1) {
        return null;
    }

    const fmBlock = normalized.slice(4, endIndex);
    const result = {};

    for (const rawLine of fmBlock.split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) continue;

        const key = line.slice(0, colonIndex).trim();
        let value = line.slice(colonIndex + 1).trim();

        // Убираем обрамляющие кавычки у строк
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        // Массив вида ["a", "b"] или ['a', 'b']
        if (value.startsWith('[') && value.endsWith(']')) {
            const inner = value.slice(1, -1).trim();
            if (inner === '') {
                result[key] = [];
            } else {
                result[key] = inner.split(',').map(item => {
                    let v = item.trim();
                    if ((v.startsWith('"') && v.endsWith('"')) ||
                        (v.startsWith("'") && v.endsWith("'"))) {
                        v = v.slice(1, -1);
                    }
                    return v;
                });
            }
        } else {
            result[key] = value;
        }
    }

    return result;
}

/**
 * Приводит путь к posix-виду (слэши /) для href.
 */
function toPosix(p) {
    return p.split(path.sep).join('/');
}

/**
 * Формирует href на директорию relDir с завершающим слэшем.
 * Браузер сам подгрузит index.html.
 * relDir — путь относительно rootDir (например, "content/java/spring-webmvc").
 */
function makeHref(relDir) {
    if (!relDir) return `${SITE_PREFIX}/`;
    return `${SITE_PREFIX}/${relDir}/`;
}

/**
 * Собирает иерархию TOC из всех .md файлов в content.
 *
 * Модель:
 *   - path[0]  -> h2 (узел-раздел)
 *   - path[1..] -> промежуточные узлы-папки (<li><a>имя</a>...)
 *   - title    -> отдельный лист-статья, вложенный в последний узел path
 *
 * Узел: { name, children: Map, articles: [], dir: string|null }
 *   - children  — вложенные узлы-папки
 *   - articles  — статьи ({ title, dir }), привязанные к этому узлу
 *   - dir       — относительная директория (от rootDir) последнего md-файла,
 *                 который «прошёл» через этот узел (для ссылки)
 */
function buildTocTree(files) {
    const rootNode = { name: null, children: new Map(), articles: [], dir: null };

    for (const file of files) {
        const fm = parseFrontMatter(file);

        if (!fm || !fm.path || !Array.isArray(fm.path) || fm.path.length === 0) {
            const rel = path.relative(rootDir, file);
            console.log(`${COLOR_YELLOW}Пропуск (нет path в front matter): ${rel}${COLOR_RESET}`);
            continue;
        }

        const pathParts = fm.path.map(p => String(p));
        const title = fm.title ? String(fm.title) : '';
        const relDir = toPosix(path.relative(rootDir, path.dirname(file)));

        let currentNode = rootNode;
        for (const part of pathParts) {
            if (!currentNode.children.has(part)) {
                currentNode.children.set(part, { name: part, children: new Map(), articles: [], dir: null });
            }
            currentNode = currentNode.children.get(part);
            currentNode.dir = relDir;
        }

        // title — отдельная статья, вложенная в последний узел path
        if (title) {
            currentNode.articles.push({ title, dir: relDir });
        }

        const rel = path.relative(rootDir, file);
        console.log(`${COLOR_GREEN}Добавлен: ${rel} (path=${JSON.stringify(pathParts)})${COLOR_RESET}`);
    }

    return rootNode;
}

/**
 * Экранирует HTML-спецсимволы.
 */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Рендерит верхний уровень TOC: каждый узел первого уровня — <section><h2>...</h2><ul>...</ul></section>.
 */
function renderTopLevel(node, indent) {
    const pad = ' '.repeat(indent);
    const childPad = ' '.repeat(indent + 4);
    let html = '';

    const sorted = Array.from(node.children.values()).sort((a, b) =>
        a.name.localeCompare(b.name, 'ru')
    );

    for (const child of sorted) {
        html += `${pad}<section>\n`;
        html += `${childPad}<h2>${escapeHtml(child.name)}</h2>\n`;

        if (child.children.size > 0 || child.articles.length > 0) {
            html += `${childPad}<ul>\n`;
            html += renderNodeBody(child, indent + 8);
            html += `${childPad}</ul>\n`;
        }

        html += `${pad}</section>\n`;
    }

    return html;
}

/**
 * Рендерит содержимое узла (его детей-папки и его статьи) на уровне <ul>.
 * Предполагается, что вызывающий уже открыл <ul>.
 */
function renderNodeBody(node, indent) {
    const pad = ' '.repeat(indent);
    const childPad = ' '.repeat(indent + 4);
    let html = '';

    const sortedChildren = Array.from(node.children.values()).sort((a, b) =>
        a.name.localeCompare(b.name, 'ru')
    );

    for (const child of sortedChildren) {
        html += `${pad}<li>\n`;
        html += `${childPad}<a href="${escapeHtml(makeHref(child.dir))}">${escapeHtml(child.name)}</a>\n`;

        if (child.children.size > 0 || child.articles.length > 0) {
            html += `${childPad}<ul>\n`;
            html += renderNodeBody(child, indent + 8);
            html += `${childPad}</ul>\n`;
        }

        html += `${pad}</li>\n`;
    }

    // Статьи текущего узла — листья
    const sortedArticles = [...node.articles].sort((a, b) => a.title.localeCompare(b.title, 'ru'));
    for (const article of sortedArticles) {
        html += `${pad}<li>\n`;
        html += `${childPad}<a href="${escapeHtml(makeHref(article.dir))}">${escapeHtml(article.title)}</a>\n`;
        html += `${pad}</li>\n`;
    }

    return html;
}

/**
 * Генерирует TOC, полностью заменяя блок от <!-- TOC STARTS HERE --> до <!-- TOC ENDS HERE -->
 */
function generateAndInsertToc() {
    if (!fs.existsSync(contentDir)) {
        console.error(`Папка content не найдена в ${rootDir}`);
        process.exit(1);
    }

    const indexPath = path.join(rootDir, 'index.html');
    if (!fs.existsSync(indexPath)) {
        console.error(`Файл index.html не найден в ${rootDir}`);
        process.exit(1);
    }

    const mdFiles = findMdFiles(contentDir);
    if (mdFiles.length === 0) {
        console.log('Файлы .md для генерации оглавления не найдены.');
        return;
    }

    const tree = buildTocTree(mdFiles);
    const tocHtml = renderTopLevel(tree, 8);

    const indexContent = fs.readFileSync(indexPath, 'utf8');
    const startMarker = '<!-- TOC STARTS HERE -->';
    const endMarker = '<!-- TOC ENDS HERE -->';

    const startIdx = indexContent.indexOf(startMarker);
    // Ищем КОНЕЦ закрывающего маркера, а не его начало
    const endMarkerStart = indexContent.indexOf(endMarker);
    const endIdx = endMarkerStart + endMarker.length;

    if (startIdx === -1 || endMarkerStart === -1 || endIdx < startIdx) {
        console.error(`Ошибка: не найдены маркеры TOC (${startMarker} / ${endMarker})`);
        process.exit(1);
    }

    // Формируем новый блок. 
    // Важно: добавляем переносы строк (\n) для читаемости HTML.
    const newBlock = `${startMarker}\n${tocHtml}${endMarker}`;

    // Собираем файл: [всё до первого маркера] + [новый блок] + [всё после второго маркера]
    const newContent = 
        indexContent.slice(0, startIdx) + 
        newBlock + 
        indexContent.slice(endIdx);

    fs.writeFileSync(indexPath, newContent, 'utf8');
    console.log(`Оглавление сгенерировано и вставлено в ${path.relative(rootDir, indexPath)} (${mdFiles.length} md-файлов).`);
}

// 5. Логика выбора файлов
let filesToProcess = [];

if (inputPath) {
    // Режим: работа с конкретным путем через -i
    filesToProcess = resolveInputPath(inputPath);

    // Определяем логику именования:
    // Если файлов больше одного -> принудительно сохраняем имена (useKeepNameLogic = true)
    // Если файл один -> смотрим на флаг --keep-name
    const useKeepNameLogic = (filesToProcess.length > 1) || (filesToProcess.length === 1 && keepName);

    // Запускаем конвертацию с выбранной логикой
    filesToProcess.forEach(file => convertFile(file, useKeepNameLogic));

} else {
    // Режим: работа с папкой content (поддерживает --today, --ago и --all)
    if (!fs.existsSync(contentDir)) {
        console.error(`Папка content не найдена в ${rootDir}`);
        process.exit(1);
    }

    // Если передан --all, конвертируем все файлы без фильтрации
    if (convertAll) {
        filesToProcess = findMdFiles(contentDir);
    } else if (agoMinutes !== null || agoDays !== null) {
        filesToProcess = findMdFiles(contentDir).filter(file => isModifiedWithin(file, agoMinutes, agoDays));
    } else if (onlyToday) {
        filesToProcess = findMdFiles(contentDir).filter(isModifiedToday);
    } else if (generateToc) {
        // Только генерация TOC, без конвертации
        generateAndInsertToc();
        process.exit(0);
    } else {
        // Если не передан ни -i, ни --all, ни --today, ни --ago — ничего не делаем
        console.log('Не указан режим работы. Используйте -i <path>, --all, --today или --ago -m/-d <value>.');
        process.exit(0);
    }

    if (filesToProcess.length === 0) {
        if (convertAll) {
            console.log('Файлы .md для обработки не найдены.');
        } else if (agoMinutes !== null || agoDays !== null) {
            const unit = agoMinutes !== null ? 'минут' : 'дней';
            const value = agoMinutes !== null ? agoMinutes : agoDays;
            console.log(`Файлы, измененные за последние ${value} ${unit}, не найдены.`);
        } else if (onlyToday) {
            console.log('Файлы, модифицированные сегодня, не найдены.');
        } else {
            console.log('Файлы .md для обработки не найдены.');
        }
        process.exit(0);
    }

    // В режиме content всегда используем логику флага --keep-name
    filesToProcess.forEach(file => convertFile(file, keepName));
}

// Если запрошена генерация TOC — выполняем её после (или вместо) конвертации
if (generateToc) {
    generateAndInsertToc();
}