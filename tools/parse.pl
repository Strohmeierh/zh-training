#!/usr/bin/perl
# Parst grundkenntnistest_kanton_zuerich.pdf (zuvor mit `pdftotext -layout`
# extrahiert, ISO-8859-1) in strukturierte Fragendaten.
# Aufruf:  perl parse.pl zh_extract.txt > questions_raw.json
use strict;
use warnings;
use utf8;                  # Theman-Literale in dieser Datei sind UTF-8
use Encode qw(decode encode);

my $file = shift @ARGV or die "Usage: parse.pl <extract.txt>\n";
open(my $fh, '<:raw', $file) or die "open $file: $!";
local $/; my $raw = <$fh>; close($fh);
my $text = decode('iso-8859-1', $raw);
$text =~ s/\r//g;          # CRLF -> LF
$text =~ s/\x0c//g;        # Form-Feed entfernen

my @lines = split /\n/, $text, -1;

# --- Themen / Bereiche ---
my %THEMES = (
  1 => 'Demokratie und Föderalismus',
  2 => 'Sozialstaat und Zivilgesellschaft',
  3 => 'Geschichte',
  4 => 'Geografie',
  5 => 'Kultur und Alltagskultur',
);

my $started = 0;     # erst nach erster Seitenfusszeile beginnt der Inhalt (TOC weg)
my ($thema, $bereich) = ('', '');
my @buffer;          # gesammelte Inhaltszeilen der aktuellen Frage
my @questions;
my $id = 0;

sub flush_question {
  my ($answer) = @_;
  # buffer -> Frage + Optionen
  my (@qlines, %opt, $curopt);
  for my $ln (@buffer) {
    if ($ln =~ /^\s*([a-d])\)\s?(.*)$/) {
      $curopt = $1;
      $opt{$curopt} = $2;
    } elsif (defined $curopt) {
      next if $ln =~ /^\s*$/;
      $opt{$curopt} .= " \x{2039}J\x{203a}" . $ln;   # ‹J› = Join-Marker
    } else {
      next if $ln =~ /^\s*$/;
      push @qlines, $ln;
    }
  }
  @buffer = ();
  return unless @qlines;          # leere Blöcke ignorieren
  $id++;
  my $frage = join(" \x{2039}J\x{203a}", @qlines);
  for my $k (qw(a b c d)) { $opt{$k} = '' unless defined $opt{$k}; }
  # Whitespace normalisieren (Join-Marker bleiben erhalten)
  for ($frage, @opt{qw(a b c d)}) { s/\s+/ /g; s/^ //; s/ $//; }
  push @questions, {
    id => $id, thema => $thema, bereich => $bereich,
    frage => $frage,
    a => $opt{a}, b => $opt{b}, c => $opt{c}, d => $opt{d},
    richtig => $answer,
  };
}

for my $ln (@lines) {
  if ($ln =~ m{^\s*Seite\s+\d+/78\s*$}) { $started = 1; next; }
  next unless $started;
  # Themen-Header
  if ($ln =~ /^([1-5])\s+(\D.+?)\s*$/ and $THEMES{$1} and index($2,'  ')<0) {
    $thema = $THEMES{$1}; next;
  }
  # Bereichs-Header
  if ($ln =~ /^([1-5])\.([1-3])\s+(Bund|Kanton|Gemeinde)\s*$/) {
    $bereich = $3; next;
  }
  if ($ln =~ /^\s*Richtige Antwort:\s*([a-d])\b/) {
    flush_question($1); next;
  }
  push @buffer, $ln;
}

# --- JSON-Ausgabe (eigene, simple Serialisierung; UTF-8) ---
sub jstr {
  my $s = shift;
  $s =~ s/\\/\\\\/g; $s =~ s/"/\\"/g;
  $s =~ s/\n/\\n/g;  $s =~ s/\t/\\t/g;
  return "\"$s\"";
}
my @out;
for my $q (@questions) {
  push @out, sprintf(
    '  {"id":%d,"thema":%s,"bereich":%s,"frage":%s,"a":%s,"b":%s,"c":%s,"d":%s,"richtig":%s}',
    $q->{id}, jstr($q->{thema}), jstr($q->{bereich}), jstr($q->{frage}),
    jstr($q->{a}), jstr($q->{b}), jstr($q->{c}), jstr($q->{d}), jstr($q->{richtig}));
}
binmode(STDOUT, ':encoding(UTF-8)');
print "[\n", join(",\n", @out), "\n]\n";
print STDERR "Fragen geparst: ", scalar(@questions), "\n";
