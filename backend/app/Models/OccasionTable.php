<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;

/** Une table du plan de salle d'une occasion. */
class OccasionTable extends Model
{
    use BelongsToOrganization;

    protected $table = 'occasion_tables';

    protected $fillable = ['organization_id', 'occasion_id', 'label', 'seats'];

    protected $casts = ['seats' => 'integer'];

    public function occasion()
    {
        return $this->belongsTo(Occasion::class);
    }

    public function guests()
    {
        return $this->hasMany(Guest::class);
    }
}
