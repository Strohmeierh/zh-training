#!/usr/bin/perl
# Löst die ‹J›-Join-Marker auf: an Wort-Trennstellen ohne Leerzeichen
# zusammenfügen, an normalen Zeilenumbrüchen mit Leerzeichen.
# Reihenfolge der Marker = Dateireihenfolge. JOIN-Positionen (1-basiert) unten.
use strict; use warnings;
binmode(STDIN, ':encoding(UTF-8)');
binmode(STDOUT, ':encoding(UTF-8)');
local $/; my $s = <STDIN>;

my %JOIN = map { $_ => 1 } (
  1,2,6,14,17,18,19,25,28,29,33,34,35,36,37,38,41,42,44,45,48,49,52,57,60,61,
  63,65,66,67,68,69,70,71,72,73,76,79,80,81,87,88,92,95,97,101,103,104,109,
  110,115,119,121,124,125,127,128
);

my $n = 0;
# Marker inkl. optionaler umgebender Leerzeichen ersetzen
$s =~ s/ *\x{2039}J\x{203a} */ ++$n; $JOIN{$n} ? '' : ' ' /ge;

print $s;
print STDERR "Join-Marker verarbeitet: $n (davon ", scalar(keys %JOIN), " ohne Leerzeichen)\n";
