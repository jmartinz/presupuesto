// VALUE FORMATTERS

// Pretty print a number by inserting ',' thousand separator
function formatNumber(value, postfix) {  
  var s = Math.abs(value) + '';
  var leftovers = s.length % 3;
  var formatted = leftovers > 0 ? s.substring(0, leftovers) : '';

  for ( var pos=leftovers; pos<s.length; pos+=3 ) {
    if ( formatted.length > 0 )
      formatted += '.';
    formatted += s.substring(pos, pos+3);
  }
  return (value<0 ? '-' : '') + formatted + (postfix||'');
}

// Format currency amount
function formatAmount(value, postfix) {
  if (value == null) return '';
  value = Number(value/100).toFixed(0); // Ignore fractions. Also note value is in cents originally

  return formatNumber(value, '\xA0€');
}

// Format currency amount
function formatSimplifiedAmount(value, postfix) {
  if (value == null) return '';
  value = Number(value/100).toFixed(0); // Ignore fractions. Also note value is in cents originally

  if ( value > 1000000 ) {
    return formatDecimal(value/1000000)+'\xA0mill.\xA0€';
  } else if ( value > 1000 ) {
    return formatDecimal(value/1000)+'\xA0mil\xA0€';
  } else
    return formatNumber(value, '\xA0€');
}

// Format decimal number
function formatDecimal(value, precision) {
  // Clumsy way of showing numbers in Spanish locale (,), but will do for now
  return Number(value).toFixed(precision||2).replace('.',',');
}

// Pretty print a number by inserting ',' thousand separator
function formatCellNumber(row, cell, value, columnDef, dataContext) {
  return formatAmount(value);
}

// Display amount adjusted for inflation (real, versus nominal)
function formatReal(row, cell, value, columnDef, dataContext) {
  if (value == null) return '';
  var realValue = adjustInflation(value, columnDef.stats, columnDef.year);
  return formatAmount(realValue);
}

// Display amount as percentage of total
function formatPercentage(row, cell, value, columnDef, dataContext) {
  if (value == null) return '';
  if (dataContext.root == null) return "100,00 %"; // No root => independent object
  return formatDecimal(value / columnValueExtractor(dataContext.root, columnDef) * 100) + " %";
}

// Display amount as expense per capita
function formatPerCapita(row, cell, value, columnDef, dataContext) {
  if (value == null) return '';
  // Note value is in cents originally
  var realValue = adjustInflation(value/100, columnDef.stats, columnDef.year);

  // Our stats for year X indicate the population for December 31st of that year so,
  // since we're adjusting inflation for January 1st it seems more accurate to use the
  // population for that date, i.e. the one for the last day of the previous year.
  var population = getPopulationFigure(columnDef.stats, columnDef.year, dataContext.id);

  return formatDecimal(realValue / population) + " €";
}

// Convenience methods

function getPopulationFigure(stats, year, entity_id) {
  // Standard scenario: we get an array of population figures by year, we just pick the right one
  var population = stats.population[year];

  // More complex one: we're displaying a list of entities, each with their own stats
  if (population === undefined) {
    if (entity_id === undefined)
      return undefined; // A breakdown total or similar case, not much we can do

    stats = stats.population[entity_id];
    if (stats === undefined) {
      console.warn("Couldn't find population stats for "+entity_id+".");
      return undefined;
    }
    population = stats[year];
  }

  return population;
}

function adjustInflation(value, stats, year) {
  if ( value === undefined )
    return undefined;

  // The inflation index in the stats refers to the last day of the year. We adjust the budget
  // assuming it happens on January 1st, so we use the inflation index _of the year before_.
  // Think of it like this: when looking at the budget for 2012 in 2012, nominal=real. This is
  // so because the inflation index at December 31st 2011 is 100, i.e. nominal=real.
  return value / stats['inflation'][year-1].inflation_index * 100.0;
}

function getFormatter(formatter) {
  var formatters = {  nominal: formatCellNumber,
                      real: formatReal,
                      percentage: formatPercentage,
                      per_capita: formatPerCapita };
  return formatters[formatter];
}