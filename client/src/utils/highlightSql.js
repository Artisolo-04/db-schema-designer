const SQL_KEYWORDS = /\b(CREATE|TABLE|ALTER|ADD|CONSTRAINT|FOREIGN|PRIMARY|KEY|REFERENCES|ON|DELETE|UPDATE|CASCADE|SET|NULL|NOT|UNIQUE|RESTRICT|NO|ACTION)\b/g;

export function highlightSql(sql) {
  const lines = sql.split('\n');
  return lines.map((line, i) => {
    const parts = [];
    let lastIndex = 0;
    let match;
    const re = new RegExp(SQL_KEYWORDS);
    while ((match = re.exec(line)) !== null) {
      if (match.index > lastIndex) parts.push(line.slice(lastIndex, match.index));
      parts.push({ type: 'keyword', text: match[0], key: `${i}-${match.index}` });
      lastIndex = match.index + match[0].length;
    }
    const rest = line.slice(lastIndex);
    const withStrings = rest.split(/("[^"]*")/g).map((chunk, j) => (
      chunk.startsWith('"')
        ? { type: 'string', text: chunk, key: `${i}-str-${j}` }
        : chunk
    ));
    return { lineIndex: i, parts, withStrings };
  });
}
